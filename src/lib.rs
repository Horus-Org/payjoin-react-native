use bitcoin::Network;
use payjoin::PjUri;
use payjoin::IntoUrl;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Define the network
    let network = Network::Testnet;

    // Example PayJoin URI
    let uri = "bitcoin:tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0?amount=0.001&pj=https://example.com/payjoin";
    
    // Parse URI into PjUri
    let pj_uri = PjUri::try_from(uri)?;
    let address = pj_uri.address();

    println!("Parsed PayJoin URI: {:?}", pj_uri);

    // Validate and print the address
    if address.is_valid_for_network(network) {
        println!("Address: {}", address);
    } else {
        return Err("Address is not valid for the specified network".into());
    }

    // Print the amount if present
    if let Some(amount) = pj_uri.amount() {
        println!("Amount: {} BTC", amount.to_btc());
    }

    // Print the PayJoin endpoint if present
    if let Some(endpoint) = pj_uri.pj() {
        println!("PayJoin endpoint: {}", endpoint);
    }

    // Reconstruct and reparse the URI to verify round-trip correctness
    let mut uri_string = format!("bitcoin:{}", address);
    let mut query_parts = Vec::new();

    if let Some(amount) = pj_uri.amount() {
        query_parts.push(format!("amount={}", amount.to_btc()));
    }

    if let Some(pj) = pj_uri.pj() {
        query_parts.push(format!("pj={}", pj));
    }

    if !query_parts.is_empty() {
        uri_string.push('?');
        uri_string.push_str(&query_parts.join("&"));
    }

    println!("Reconstructed URI: {}", uri_string);

    let reparsed_uri = PjUri::try_from(uri_string.as_str())?;
    println!("Reparsed URI: {:?}", reparsed_uri);

    // Final address check
    let final_address = reparsed_uri.address();
    if final_address.is_valid_for_network(network) {
        println!("Final address: {}", final_address);
    } else {
        return Err("Final address is not valid for the specified network".into());
    }

    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_payjoin_uri_parsing() -> Result<(), Box<dyn std::error::Error>> {
        let network = Network::Testnet;
        let test_uri = "bitcoin:tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0?amount=0.001&pj=https://example.com/payjoin";

        let pj_uri = PjUri::try_from(test_uri)?;

        let address = pj_uri.address();
        assert_eq!(address.to_string(), "tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0");
        assert!(address.is_valid_for_network(network));

        if let Some(amount) = pj_uri.amount() {
            assert_eq!(amount.to_btc(), 0.001);
        } else {
            panic!("Amount should be present");
        }

        if let Some(endpoint) = pj_uri.pj() {
            assert_eq!(endpoint.as_str(), "https://example.com/payjoin");
        } else {
            panic!("PayJoin endpoint should be present");
        }

        Ok(())
    }
}