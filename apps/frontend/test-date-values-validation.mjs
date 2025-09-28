import { searchQueryFieldSchema } from "@voter-file-tool/shared-validators";

// Test date field with values array
const testDateValuesField = {
  field: "DOB",
  values: ["2023-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
};

console.log("Testing date values field validation...");
console.log("Input:", JSON.stringify(testDateValuesField, null, 2));

try {
  const result = searchQueryFieldSchema.parse(testDateValuesField);
  console.log("✅ Validation passed!");
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.log("❌ Validation failed!");
  console.log("Error:", error);
}
