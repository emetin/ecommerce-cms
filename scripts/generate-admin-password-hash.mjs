import bcrypt from "bcryptjs";

const plainPassword = process.argv[2];

if (!plainPassword) {
  console.error('Usage: npm run admin:hash -- "YourNewStrongPassword"');
  process.exit(1);
}

if (plainPassword.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const saltRounds = 12;
const hash = await bcrypt.hash(plainPassword, saltRounds);

console.log("");
console.log("Admin password hash:");
console.log(hash);
console.log("");
console.log("Copy this value into Google Sheets:");
console.log("admin_users > password_hash");
console.log("");