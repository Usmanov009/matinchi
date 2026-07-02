import "../src/config/env.js";
import "../src/db/database.js";
import { userRepository } from "../src/repositories/userRepository.js";
import { hashPassword } from "../src/utils/password.js";

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Foydalanish: node scripts/createUser.js <username> <password>");
    process.exit(1);
  }

  const existing = userRepository.findByUsername(username);
  if (existing) {
    console.error(`❌ "${username}" nomli foydalanuvchi allaqachon mavjud.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = userRepository.create({ username, passwordHash });
  console.log(`✅ Foydalanuvchi yaratildi: ${user.username} (id: ${user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Xatolik:", err.message);
  process.exit(1);
});
