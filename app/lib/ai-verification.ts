export interface ExtractedDocumentData {
  fullName: string | null;
  matricNumber: string | null;
  institution: string | null;
  department: string | null;
  photoDetected: boolean;
  rawText: string;
}

export interface VerificationResult {
  success: boolean;
  confidence: number;
  extractedData: ExtractedDocumentData;
  matches: {
    name: boolean;
    matric: boolean;
    institution: boolean;
  };
  recommendation: "approve" | "review" | "reject";
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function normalizeMatric(input: string | null): string {
  if (!input) return "";
  return input.toUpperCase().replace(/[\s\-\.]/g, "");
}

function getRecommendation(confidence: number): "approve" | "review" | "reject" {
  if (confidence >= 0.85) return "approve";
  if (confidence >= 0.60) return "review";
  return "reject";
}

export async function verifyDocument(
  imageUrl: string,
  userEnteredData: { name: string; matric: string }
): Promise<VerificationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      confidence: 0,
      extractedData: {
        fullName: null,
        matricNumber: null,
        institution: null,
        department: null,
        photoDetected: false,
        rawText: "",
      },
      matches: { name: false, matric: false, institution: false },
      recommendation: "review",
    };
  }

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            {
              type: "text",
              text: `You are a document verification AI. Analyze this student ID card or biodata form and extract:
- Full Name (as written on document)
- Matriculation Number (student ID number)
- Institution Name
- Department (if visible)
- Whether a photo is visible on the document

Return ONLY a valid JSON object with these exact fields:
{
  "fullName": "extracted name or null",
  "matricNumber": "extracted matric number or null",
  "institution": "extracted institution or null",
  "department": "extracted department or null",
  "photoDetected": true/false,
  "rawText": "all readable text on the document"
}

If a field cannot be read, use null. Be precise with numbers and names.`,
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    let extracted: ExtractedDocumentData;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        fullName: null, matricNumber: null, institution: null,
        department: null, photoDetected: false, rawText: content,
      };
    } catch {
      extracted = {
        fullName: null, matricNumber: null, institution: null,
        department: null, photoDetected: false, rawText: content,
      };
    }

    const nameSimilarity = levenshteinSimilarity(
      extracted.fullName?.toLowerCase() || "",
      userEnteredData.name.toLowerCase()
    );
    const nameMatch = nameSimilarity > 0.75;

    const matricNormalized = normalizeMatric(extracted.matricNumber);
    const userMatricNormalized = normalizeMatric(userEnteredData.matric);
    const matricMatch =
      matricNormalized.length > 0 &&
      (matricNormalized === userMatricNormalized ||
        matricNormalized.includes(userMatricNormalized) ||
        userMatricNormalized.includes(matricNormalized));

    const institutionValid =
      extracted.institution?.toLowerCase().includes("lagos") ||
      extracted.institution?.toLowerCase().includes("unilag") ||
      extracted.institution?.toLowerCase().includes("university of Lagos");

    let confidence =
      (nameMatch ? 0.3 : nameSimilarity * 0.3) +
      (matricMatch ? 0.4 : 0) +
      (institutionValid ? 0.2 : 0) +
      (extracted.photoDetected ? 0.1 : 0);

    if (!extracted.fullName) confidence -= 0.2;
    if (!extracted.matricNumber) confidence -= 0.3;
    if (!extracted.institution) confidence -= 0.1;
    if (!extracted.photoDetected) confidence -= 0.1;

    confidence = Math.max(0, Math.min(1, confidence));

    return {
      success: true,
      confidence,
      extractedData: extracted,
      matches: { name: nameMatch, matric: matricMatch, institution: !!institutionValid },
      recommendation: getRecommendation(confidence),
    };
  } catch (error) {
    console.error("AI verification error:", error);
    return {
      success: false,
      confidence: 0,
      extractedData: {
        fullName: null, matricNumber: null, institution: null,
        department: null, photoDetected: false, rawText: "",
      },
      matches: { name: false, matric: false, institution: false },
      recommendation: "review",
    };
  }
}
