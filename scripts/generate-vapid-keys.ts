import webpush from "web-push"

const keys = webpush.generateVAPIDKeys()
console.log("VAPID Public Key:", keys.publicKey)
console.log("VAPID Private Key:", keys.privateKey)
console.log("\nAdd to .env:")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
