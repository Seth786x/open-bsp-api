import { evaluate } from "mathjs";
import { z } from "zod";
const CalculatorInputSchema = z.object({
  expression: z.string().describe("Mathematical expression to evaluate.")
});
const CalculatorOutputSchema = z.object({
  result: z.number().describe("The result of the expression.")
});
export async function calculatorToolImplementation(input) {
  const result = await evaluate(input.expression);
  return {
    result
  };
}
export const CalculatorTool = {
  provider: "local",
  type: "function",
  name: "calculator",
  description: 'Computes the result of simple mathematical expressions using the Math.js library. Handles basic arithmetic operations like addition, subtraction, multiplication, division, exponentiation, and common functions like sin, cos, abs, exp, and random. Example expressions: "1.2 * (2 + 4.5)", "12.7 cm to inch", "sin(45 deg) ^ 2".',
  inputSchema: z.toJSONSchema(CalculatorInputSchema),
  outputSchema: z.toJSONSchema(CalculatorOutputSchema),
  implementation: calculatorToolImplementation
};
