use bitcoin::Network;
use payjoin::{PjUri, Uri}; // Import Uri for initial parsing

pub fn main() -> Result<(), String> {
    use payjoin::UriExt;
    
    // Define the network
    let network = Network::Testnet;

    // Example PayJoin URI
    let uri_str = "bitcoin:tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0?amount=0.001&pj=https://example.com/payjoin";

    // 1. Parse into a generic URI with unchecked network
    let unchecked_uri: Uri<'_, bitcoin::address::NetworkUnchecked> = Uri::try_from(uri_str)
        .map_err(|e| e.to_string())?;

    // 2. Validate and set the network for the URI's address
    let checked_uri: Uri<'_, bitcoin::address::NetworkChecked> = unchecked_uri.require_network(network)
        .map_err(|e| e.to_string())?;

    // 3. Check for Payjoin support and convert to PjUri
    let pj_uri: PjUri<'_> = checked_uri
        .check_pj_supported()
        .map_err(|uri_box| format!("URI does not support Payjoin: {}", uri_box))?;

    println!("Parsed PayJoin URI: {:?}", pj_uri);

    let address = &pj_uri.address;
    // The address is now guaranteed to be valid for the specified network
    // because `require_network(network)` succeeded.
    println!("Address: {} (valid for {:?})", address, network);

    // Print the amount if present
    if let Some(amount) = pj_uri.amount { // amount is a field
        println!("Amount: {} BTC", amount.to_btc());
    }

    // Print the PayJoin endpoint if present
    // pj_uri.extras is PayjoinExtras, which has an endpoint() method.
    // This endpoint is guaranteed to be present in a PjUri.
    let payjoin_endpoint = pj_uri.extras.endpoint();
    println!("PayJoin endpoint: {}", payjoin_endpoint);

    // Reconstruct and reparse the URI to verify round-trip correctness
    // PjUri implements Display, which gives the canonical string.
    let reconstructed_uri_string = pj_uri.to_string();
    println!("Reconstructed URI (using pj_uri.to_string()): {}", reconstructed_uri_string);

    // Reparse (same logic as above)
    let unchecked_reparsed_uri: Uri<'_, bitcoin::address::NetworkUnchecked> = Uri::try_from(reconstructed_uri_string.as_str())
        .map_err(|e| e.to_string())?;
    let checked_reparsed_uri = unchecked_reparsed_uri.require_network(network)
        .map_err(|e| e.to_string())?;
    let reparsed_pj_uri: PjUri<'_> = checked_reparsed_uri
        .check_pj_supported()
        .map_err(|uri_box| format!("Reparsed URI does not support Payjoin: {}", uri_box))?;
    println!("Reparsed URI: {:?}", reparsed_pj_uri);

    // Final address check
    let final_address = &reparsed_pj_uri.address;
    // This address is also guaranteed to be valid for the network.
    println!("Final address: {} (valid for {:?})", final_address, network);

    Ok(())
}

#[cfg(test)]mod tests {
    use super::*;    // Note: Imports from main are implicitly available here due to `use super::*;`
    // but explicit imports for traits are good practice if used directly in test functions.
    // use payjoin::{PjUri, Uri};
    // use payjoin::bitcoin_uri::network::UriExt as BitcoinUriNetworkExt;
    // use payjoin::uri::UriExt as PayjoinUriExt;

    #[test]
    fn test_payjoin_uri_parsing() -> Result<(), String> {
        use payjoin::UriExt;
        
        let network = Network::Testnet;
        let test_uri_str = "bitcoin:tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0?amount=0.001&pj=https://example.com/payjoin";

        let unchecked_uri: Uri<'_, bitcoin::address::NetworkUnchecked> = Uri::try_from(test_uri_str)
            .map_err(|e| e.to_string())?;
        let checked_uri = unchecked_uri.require_network(network)
            .map_err(|e| e.to_string())?;
        let pj_uri: PjUri<'_> = checked_uri
            .check_pj_supported()
            .map_err(|uri_box| format!("Test URI does not support Payjoin: {}", uri_box))?;

        let address = pj_uri.address; // address is a field
        assert_eq!(address.to_string(), "tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0");
        // The network validity is ensured by `require_network(network)` succeeding.

        if let Some(amount) = pj_uri.amount { // amount is a field
            assert_eq!(amount.to_btc(), 0.001);
        } else {
            panic!("Amount should be present");
        }

        // pj_uri.extras.endpoint() returns &Url, which is guaranteed in PjUri
        let payjoin_endpoint = pj_uri.extras.endpoint();
        assert_eq!(payjoin_endpoint.as_str(), "https://example.com/payjoin");

        Ok(())
    }
}