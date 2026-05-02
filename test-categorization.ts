// Test script to verify categorization logic

const sportsBlacklist = [
  "arsenal nuclear",
  "arsenal militar",
  "macron anuncia",
  "frança anuncia",
];

const categoryKeywords: Record<string, string[]> = {
  esportes: ["arsenal fc vence", "arsenal fc perde", "futebol"],
  internacional: ["macron", "frança", "europa", "donald trump"],
};

function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();

  const hasBlacklistedTerm = sportsBlacklist.some(term => lowerText.includes(term));

  const priorityOrder = ["esportes", "internacional"];

  for (const category of priorityOrder) {
    if (category === "esportes" && hasBlacklistedTerm) {
      console.log(`  ❌ Skipping esportes due to blacklist match`);
      continue;
    }

    const keywords = categoryKeywords[category];
    const matchedKeyword = keywords.find(keyword => lowerText.includes(keyword));
    if (matchedKeyword) {
      console.log(`  ✅ Matched keyword "${matchedKeyword}" for category "${category}"`);
      return category;
    }
  }

  return "geral";
}

// Test cases
const testCases = [
  {
    title: "França anuncia que vai expandir seu arsenal nuclear e inclui Europa",
    description: "Macron anunciou o aumento do arsenal nuclear da França e incluiu 8 países europeus em nova...",
    expected: "internacional"
  },
  {
    title: "Arsenal FC vence Manchester City em jogo emocionante",
    description: "Time inglês conquista vitória importante no campeonato",
    expected: "esportes"
  },
];

console.log("\n🧪 Testing categorization logic:\n");

for (const test of testCases) {
  console.log(`\nTest: "${test.title.substring(0, 60)}..."`);
  console.log(`Expected: ${test.expected}`);

  const result = detectCategory(test.title + " " + test.description);
  console.log(`Result: ${result}`);
  console.log(`Status: ${result === test.expected ? "✅ PASS" : "❌ FAIL"}`);
}

console.log("\n");
