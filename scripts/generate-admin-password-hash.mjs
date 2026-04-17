import bcrypt from "bcryptjs";

const plainPassword = process.argv[2];

if (!plainPassword) {
  console.error('Usage: npm run admin:hash -- "YourNewStrongPassword"');
  process.exit(1);
}

const saltRounds = 12;
const hash = await bcrypt.hash(plainPassword, saltRounds);

console.log("\nADMIN_PASSWORD_HASH=");
console.log(hash);
console.log("");