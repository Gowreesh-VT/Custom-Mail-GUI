import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export type DeptHeadInfo = {
  head1: string;
  head1_post: string;
  head2: string;
  head2_post: string;
};

export type LetterConfig = {
  enabled: boolean;
  mode: "generate_docx" | "local_pdf_folder";
  defaultTemplateName?: string; // e.g. "MIC_Letter_Normal.docx"
  entrepreneurshipTemplateName?: string; // e.g. "MIC_Letter_Entrepreneurship.docx"
  pdfFolder?: string; // e.g. "generated_pdf"
  outputFileNameFormat?: string; // e.g. "{{department}}_{{regno}}.pdf"
  deptHeads?: Record<string, DeptHeadInfo>;
  positionMapping?: Record<string, string>;
};

export const DEFAULT_DEPT_HEADS: Record<string, DeptHeadInfo> = {
  "Management": { head1: "Ramakrishnan P H", head1_post: "Management Head", head2: "Akanksha Kulkarni", head2_post: "Events Head" },
  "Development": { head1: "Gouse Moideen S", head1_post: "Technical Head", head2: "Tarang Gupta", head2_post: "Projects Head" },
  "Technical": { head1: "Gouse Moideen S", head1_post: "Technical Head", head2: "Tarang Gupta", head2_post: "Projects Head" },
  "AI/ML": { head1: "Gouse Moideen S", head1_post: "Technical Head", head2: "Tarang Gupta", head2_post: "Projects Head" },
  "Competitive Coding": { head1: "Gouse Moideen S", head1_post: "Technical Head", head2: "Tarang Gupta", head2_post: "Projects Head" },
  "Cyber Security": { head1: "Gouse Moideen S", head1_post: "Technical Head", head2: "Tarang Gupta", head2_post: "Projects Head" },
  "UI/UX": { head1: "Gouse Moideen S", head1_post: "Technical Head", head2: "Tarang Gupta", head2_post: "Projects Head" },
  "Design": { head1: "Preeti B R", head1_post: "Creatives Head", head2: "Ahmed Sajjad Shihab", head2_post: "Publicity Head" },
  "Creatives": { head1: "Preeti B R", head1_post: "Creatives Head", head2: "Ahmed Sajjad Shihab", head2_post: "Publicity Head" },
  "Social Media & Content": { head1: "Preeti B R", head1_post: "Creatives Head", head2: "Ahmed Sajjad Shihab", head2_post: "Publicity Head" }
};

export const DEFAULT_POSITIONS: Record<string, string> = {
  "Management": "Member of Management",
  "Entrepreneurship": "Member of Entrepreneurship",
  "Development": "Member of Development",
  "Technical": "Member of Technical",
  "Competitive Coding": "Member of Competitive Coding",
  "UI/UX": "Member of UI/UX",
  "Cyber Security": "Member of Cyber Security",
  "AI/ML": "Member of AI/ML",
  "Social Media & Content": "Member of Social Media & Content",
  "Creatives": "Member of Creatives",
  "Design": "Member of Design"
};

/**
 * Helper to get value case-insensitively from a row
 */
export function getRowValue(row: Record<string, any>, possibleKeys: string[], defaultValue = ""): string {
  const lowerMap = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    lowerMap.set(k.toLowerCase().trim().replace(/[{}[\]]/g, ""), String(v || "").trim());
  }

  for (const key of possibleKeys) {
    const cleanKey = key.toLowerCase().trim().replace(/[{}[\]]/g, "");
    if (lowerMap.has(cleanKey)) {
      const val = lowerMap.get(cleanKey);
      if (val !== undefined && val !== "") return val;
    }
  }

  return defaultValue;
}

/**
 * Builds replacement map for a recipient row
 */
export function buildLetterReplacements(
  row: Record<string, any>,
  customDeptHeads?: Record<string, DeptHeadInfo>,
  customPositions?: Record<string, string>
): { replacements: Record<string, string>; dept: string; regno: string; name: string } {
  const name = getRowValue(row, ["NAME", "Full Name", "Full_Name", "Member Name", "Participant Name", "Name"]);
  const regno = getRowValue(row, ["REGISTRATION_NUMBER", "Registration Number", "Reg_No", "Registration_No", "RegNo", "Roll Number", "ID"]);
  const dept = getRowValue(row, ["DEPARTMENT", "Department", "Dept", "Domain"]);
  const email = getRowValue(row, ["EMAIL_ID", "Email", "Email ID", "Email_ID", "email"]);

  const deptHeads = { ...DEFAULT_DEPT_HEADS, ...(customDeptHeads || {}) };
  const positionMapping = { ...DEFAULT_POSITIONS, ...(customPositions || {}) };

  const position = positionMapping[dept] || (dept ? `Member of ${dept}` : "Member");
  const heads = deptHeads[dept] || { head1: "", head1_post: "", head2: "", head2_post: "" };

  const replacements: Record<string, string> = {
    "[Name]": name,
    "[NAME]": name,
    "{{NAME}}": name,
    "{{name}}": name,
    "[Position]": position,
    "[POSITION]": position,
    "{{POSITION}}": position,
    "{{position}}": position,
    "[Registration Number]": regno,
    "[REGISTRATION_NUMBER]": regno,
    "{{REGISTRATION_NUMBER}}": regno,
    "{{regno}}": regno,
    "[Department]": dept,
    "[DEPARTMENT]": dept,
    "{{DEPARTMENT}}": dept,
    "{{department}}": dept,
    "[Email]": email,
    "[EMAIL_ID]": email,
    "{{EMAIL_ID}}": email,
    "{{email}}": email,
    "[Head1]": heads.head1,
    "{{Head1}}": heads.head1,
    "[Head1_Post]": heads.head1_post,
    "{{Head1_Post}}": heads.head1_post,
    "[Head2]": heads.head2,
    "{{Head2}}": heads.head2,
    "[Head2_Post]": heads.head2_post,
    "{{Head2_Post}}": heads.head2_post
  };

  // Add any extra CSV columns as replacements
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.trim();
    if (!replacements[`[${cleanKey}]`]) replacements[`[${cleanKey}]`] = String(v ?? "");
    if (!replacements[`{{${cleanKey}}}`]) replacements[`{{${cleanKey}}}`] = String(v ?? "");
  }

  return { replacements, dept, regno, name };
}

/**
 * Replaces placeholders in XML content across runs (<w:p> and <w:t>)
 */
function replaceInDocxXml(xml: string, replacements: Record<string, string>): string {
  // Process each paragraph <w:p ...> ... </w:p>
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    let updatedPara = paragraphXml;

    for (const [key, value] of Object.entries(replacements)) {
      if (!key || !updatedPara.includes(key)) {
        // Also check if key exists when tags are stripped
        const plainText = updatedPara.replace(/<[^>]+>/g, "");
        if (!plainText.includes(key)) continue;
      }

      // Check if key is contained directly inside any single <w:t> tag
      let replacedInSingleRun = false;
      updatedPara = updatedPara.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (match, openTag, text, closeTag) => {
        if (text.includes(key)) {
          replacedInSingleRun = true;
          return `${openTag}${text.replaceAll(key, value)}${closeTag}`;
        }
        return match;
      });

      // If key was split across multiple <w:t> tags in this paragraph
      if (!replacedInSingleRun) {
        const textMatches = Array.from(updatedPara.matchAll(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g));
        if (textMatches.length > 0) {
          const combined = textMatches.map((m) => m[2]).join("");
          if (combined.includes(key)) {
            const replacedCombined = combined.replaceAll(key, value);
            let idx = 0;
            updatedPara = updatedPara.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (match, openTag, _, closeTag) => {
              if (idx === 0) {
                idx++;
                return `${openTag}${replacedCombined}${closeTag}`;
              }
              idx++;
              return `${openTag}${closeTag}`;
            });
          }
        }
      }
    }

    return updatedPara;
  });
}

/**
 * Merges replacements into a DOCX buffer using JSZip
 */
export async function mergeDocxTemplate(docxBuffer: Buffer, replacements: Record<string, string>): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer);

  const xmlFilePatterns = [
    /^word\/document\.xml$/,
    /^word\/header\d*\.xml$/,
    /^word\/footer\d*\.xml$/,
    /^word\/footnotes\.xml$/,
    /^word\/endnotes\.xml$/
  ];

  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (xmlFilePatterns.some((pattern) => pattern.test(relativePath))) {
      const originalXml = await file.async("string");
      const updatedXml = replaceInDocxXml(originalXml, replacements);
      zip.file(relativePath, updatedXml);
    }
  }

  const generatedBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return generatedBuffer;
}

/**
 * Converts DOCX Buffer to a single-page PDF on localhost
 */
export async function convertDocxToSinglePagePdf(docxBuffer: Buffer): Promise<{ pdfBuffer: Buffer; usedConverter: string }> {
  const tempId = `letter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  await fs.mkdir(tempDir, { recursive: true });

  const tempDocxPath = path.join(tempDir, "input.docx");
  const tempPdfPath = path.join(tempDir, "input.pdf");

  await fs.writeFile(tempDocxPath, docxBuffer);

  let converted = false;
  let converterName = "";

  // 1. Try LibreOffice / soffice CLI (Standard on Mac/Linux/Windows)
  const sofficeCommands = [
    "soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "libreoffice",
    "soffice.exe"
  ];

  for (const cmd of sofficeCommands) {
    try {
      await execAsync(`"${cmd}" --headless --convert-to pdf --outdir "${tempDir}" "${tempDocxPath}"`, { timeout: 20000 });
      if (await fileExists(tempPdfPath)) {
        converted = true;
        converterName = "libreoffice";
        break;
      }
    } catch {
      // try next
    }
  }

  // 2. Try macOS docx2pdf CLI if installed
  if (!converted && process.platform === "darwin") {
    try {
      await execAsync(`docx2pdf "${tempDocxPath}" "${tempPdfPath}"`, { timeout: 20000 });
      if (await fileExists(tempPdfPath)) {
        converted = true;
        converterName = "docx2pdf";
      }
    } catch {
      // try next
    }
  }

  if (converted && (await fileExists(tempPdfPath))) {
    try {
      const rawPdfBytes = await fs.readFile(tempPdfPath);
      const pdfDoc = await PDFDocument.load(rawPdfBytes);

      // Keep only the first page
      if (pdfDoc.getPageCount() > 0) {
        const singlePageDoc = await PDFDocument.create();
        const [firstPage] = await singlePageDoc.copyPages(pdfDoc, [0]);
        singlePageDoc.addPage(firstPage);
        const singlePageBytes = await singlePageDoc.save();
        await cleanDir(tempDir);
        return { pdfBuffer: Buffer.from(singlePageBytes), usedConverter: converterName };
      }

      await cleanDir(tempDir);
      return { pdfBuffer: rawPdfBytes, usedConverter: converterName };
    } catch (e) {
      console.warn("Error trimming PDF pages:", e);
      const rawPdfBytes = await fs.readFile(tempPdfPath);
      await cleanDir(tempDir);
      return { pdfBuffer: rawPdfBytes, usedConverter: converterName };
    }
  }

  await cleanDir(tempDir);
  throw new Error("No local PDF conversion tool found. Please install LibreOffice ('brew install --cask libreoffice' on macOS) for DOCX to PDF conversion.");
}

/**
 * Checks local directory for pre-generated PDF matching a recipient
 */
export async function matchLocalPdfAttachment(
  folderPath: string,
  dept: string,
  regno: string,
  email: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const resolvedDir = path.isAbsolute(folderPath) ? folderPath : path.join(process.cwd(), folderPath);
  if (!(await fileExists(resolvedDir))) {
    return null;
  }

  const deptClean = dept.toLowerCase().replace(/[/\\& ]+/g, "_");
  const regnoClean = regno.replace(/[/\\& ]+/g, "_");
  const emailClean = email.toLowerCase().trim();

  const candidateNames = [
    `${deptClean}_${regnoClean}.pdf`,
    `${regnoClean}.pdf`,
    `${emailClean}.pdf`,
    `${regno}.pdf`,
    `${deptClean}_${regno}.pdf`
  ];

  for (const candidate of candidateNames) {
    const candidatePath = path.join(resolvedDir, candidate);
    if (await fileExists(candidatePath)) {
      const buffer = await fs.readFile(candidatePath);
      return { buffer, fileName: candidate };
    }
  }

  // Fallback: search directory for case-insensitive match on registration number
  try {
    const files = await fs.readdir(resolvedDir);
    if (regnoClean) {
      const matched = files.find((f) => f.toLowerCase().includes(regnoClean.toLowerCase()) && f.toLowerCase().endsWith(".pdf"));
      if (matched) {
        const buffer = await fs.readFile(path.join(resolvedDir, matched));
        return { buffer, fileName: matched };
      }
    }
    if (emailClean) {
      const matched = files.find((f) => f.toLowerCase().includes(emailClean.split("@")[0]) && f.toLowerCase().endsWith(".pdf"));
      if (matched) {
        const buffer = await fs.readFile(path.join(resolvedDir, matched));
        return { buffer, fileName: matched };
      }
    }
  } catch (err) {
    console.warn("Error reading local PDF directory:", err);
  }

  return null;
}

/**
 * Generates personalized letter attachment for a single row
 */
export async function generateLetterAttachmentForRow(
  row: Record<string, any>,
  config: LetterConfig,
  templateBuffers?: { defaultDocx?: Buffer; entrepreneurshipDocx?: Buffer }
): Promise<{ name: string; content: Buffer; contentType: string }> {
  const { replacements, dept, regno } = buildLetterReplacements(row, config.deptHeads, config.positionMapping);

  const deptClean = dept.toLowerCase().replace(/[/\\& ]+/g, "_") || "general";
  const regnoClean = regno.replace(/[/\\& ]+/g, "_") || `rec_${Date.now()}`;
  const defaultFileName = `${deptClean}_${regnoClean}.pdf`;

  // Mode A: Direct Local PDF Folder Matching
  if (config.mode === "local_pdf_folder") {
    const matched = await matchLocalPdfAttachment(config.pdfFolder || "generated_pdf", dept, regno, row.email || "");
    if (matched) {
      return {
        name: matched.fileName,
        content: matched.buffer,
        contentType: "application/pdf"
      };
    }
    throw new Error(`No matching PDF found in '${config.pdfFolder || "generated_pdf"}' for ${regno || dept || row.email}`);
  }

  // Mode B: Generate DOCX & Convert to PDF on Localhost
  let docxBuffer = templateBuffers?.defaultDocx;
  if (dept.toLowerCase().includes("entrepreneur") && templateBuffers?.entrepreneurshipDocx) {
    docxBuffer = templateBuffers.entrepreneurshipDocx;
  }

  if (!docxBuffer) {
    // Attempt to load from workspace root if template name is provided
    const templateName = dept.toLowerCase().includes("entrepreneur") && config.entrepreneurshipTemplateName
      ? config.entrepreneurshipTemplateName
      : config.defaultTemplateName || "MIC_Letter_Normal.docx";

    const localTemplatePath = path.isAbsolute(templateName) ? templateName : path.join(process.cwd(), templateName);
    if (await fileExists(localTemplatePath)) {
      docxBuffer = await fs.readFile(localTemplatePath);
    } else if (await fileExists(path.join(process.cwd(), "MIC_Letter_Normal.docx"))) {
      docxBuffer = await fs.readFile(path.join(process.cwd(), "MIC_Letter_Normal.docx"));
    } else {
      throw new Error(`DOCX Template '${templateName}' not found in workspace.`);
    }
  }

  // Merge DOCX
  const mergedDocx = await mergeDocxTemplate(docxBuffer, replacements);

  // Convert to PDF
  const { pdfBuffer } = await convertDocxToSinglePagePdf(mergedDocx);

  return {
    name: defaultFileName,
    content: pdfBuffer,
    contentType: "application/pdf"
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {}
}
