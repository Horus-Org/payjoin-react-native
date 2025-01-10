use std::str::FromStr;
use payjoin::bitcoin::Address;
use payjoin::Url;
use payjoin::PjUri;

fn main() {
    // Initialize URL
    let url = Url::parse("https://example.com/pay?amount=1.23¤cy=USD&label=Alice&message=Hello%20world")
        .expect("Failed to parse URL");

    // Convert URL to PjUri
    let pjuri = PjUri::from(&url).amount.label.message.expect("Failed to create PjUri from URL");
    
    // Convert PjUri to string
    let pjuri_str = pjuri.to_string();
    println!("PjUri as string: {}", pjuri_str);
    
    // Convert string back to PjUri
    let pjuri_parsed = PjUri::from(&pjuri_str).amount.message.expect("Failed to parse PjUri from string");
    
    // Convert PjUri back to URL
    let final_url = pjuri_parsed.to_url().expect("Failed to convert PjUri to URL");
    
    // Print the final URL
    println!("Final URL: {}", final_url);

    // Bitcoin address parsing
    let bitcoin_address = Address::from_str("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")
        .expect("Failed to parse Bitcoin address");
    
    println!("Bitcoin address: {:?}", bitcoin_address);
}