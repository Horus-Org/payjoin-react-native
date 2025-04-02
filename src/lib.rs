use std::str::FromStr;
use payjoin::bitcoin::{Amount, Network};
use payjoin::PjUri; // PjUri is publicly available at the crate root

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Set the network to Testnet
    let network = Network::Testnet;

    // Example BIP-21 PayJoin URI
    let uri_str = "bitcoin:tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0?amount=0.001&pj=https://example.com/payjoin";

    // Parse the URI directly into a PjUri using from_str
    let pj_uri = PjUri::from(uri_str)?;
    println!("Parsed PjUri: {:?}", pj_uri);

    // Extract and display fields
    let address = pj_uri.address().require_network(network)?;
    println!("Address: {}", address);

    if let Some(amount) = pj_uri.amount() {
        let amount_btc = amount.to_btc();
        println!("Amount: {} BTC", amount_btc);
    }

    if let Some(pj_endpoint) = pj_uri.pj() {
        println!("PayJoin endpoint: {}", pj_endpoint);
    }

    // Round-trip: Convert back to string and reparse
    let pj_uri_string = format!(
        "bitcoin:{}?amount={}&pj={}",
        address,
        pj_uri.amount().unwrap_or(Amount::from_btc(0.0)?).to_btc(),
        pj_uri.pj().unwrap_or(&payjoin::Url::parse("https://example.com")?),
    );
    println!("PjUri as string: {}", pj_uri_string);

    let reparsed_pj_uri = PjUri::from_str(&pj_uri_string)?;
    println!("Reparsed PjUri: {:?}", reparsed_pj_uri);

    // Final validation
    let final_address = reparsed_pj_uri.address().require_network(network)?;
    println!("Final validated address: {}", final_address);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pj_uri_parsing() {
        let network = Network::Testnet;
        let uri_str = "bitcoin:tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0?amount=0.001&pj=https://example.com/payjoin";

        let result = PjUri::from(uri_str);
        assert!(result.is_ok(), "Failed to parse PjUri: {:?}", result.err());

        let pj_uri = result.unwrap();
        let address = pj_uri.address().require_network(network);
        assert!(address.is_ok(), "Invalid address: {:?}", address.err());
        assert_eq!(
            address.unwrap().to_string(),
            "tb1q6rz28mcfaxtmd6v789l9rrlrusd9rarc0mh4d0"
        );
        assert_eq!(pj_uri.amount().unwrap().to_btc(), 0.001);
        assert_eq!(pj_uri.pj().unwrap().to_string(), "https://example.com/payjoin");
    }
}