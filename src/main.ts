import type TPDFDocument from "pdfkit";
import type TblobStream from "blob-stream";

// globals
declare global {
  const PDFDocument: typeof TPDFDocument;
  const blobStream: typeof TblobStream;
  function makePDF(): Promise<void>;
}

let CommandsInput: HTMLTextAreaElement | null = null;
let ErrorLogger: HTMLParagraphElement | null = null;
let FileList: FileList | null = null;

function populateGlobals() {
  CommandsInput = document.getElementById("commands") as HTMLTextAreaElement;
  ErrorLogger = document.getElementById("errors") as HTMLParagraphElement;
  FileList = (document.getElementById("files") as HTMLInputElement).files;
}

// constants
const pdfSizeModifier = 16 / 15;
const pdfSpacing = 6;
const a4width = 595.28 - pdfSpacing;
const a4height = 841.89 - pdfSpacing;

const unitsToPointsList = {
  '"': 72,
  in: 72,
  inch: 72,
  mm: 2.83464567,
  cm: 28.3464567,
} as const;

type Unit = keyof typeof unitsToPointsList;

function expressionToPoints(expr: string): number {
  let unitToPoints = 1;
  for (const unit of Object.keys(unitsToPointsList) as Unit[]) {
    if (expr.endsWith(unit)) {
      unitToPoints = unitsToPointsList[unit];
      expr = expr.slice(0, -unit.length);
      break;
    }
  }
  return Number(expr) * unitToPoints * pdfSizeModifier;
}

async function parseCommand(cmd: string) {
  cmd = cmd.replace(/\s+/g, "").toLowerCase();

  const commandRegex =
    /^image\d+,\d+,[\d.]+(|"|inch|in|mm|cm)[x*][\d.]+(|"|inch|in|mm|cm)$/;
  if (!commandRegex.test(cmd)) {
    throw "Cannot recognize the command!";
  }

  let [image, countStr, size] = cmd.split(",");

  const count = Number(countStr);

  const serial = Number(image.slice(5));

  if (serial > FileList!.length) {
    throw `${image} does not exist!`;
  }

  const fileBuffer = await FileList![serial - 1].arrayBuffer();

  const [widthStr, heightStr] = size.split(/[x*]/);

  const width = expressionToPoints(widthStr);
  if (width > a4width) {
    throw `Max allowed width ${a4width}, given ${width} ...`;
  }

  const height = expressionToPoints(heightStr);
  if (height > a4height) {
    throw `Max allowed height ${a4height}, given ${height} ...`;
  }

  return { fileBuffer, count, width, height };
}

window.makePDF = async () => {
  populateGlobals();

  const Commands = CommandsInput!.value.trim();
  let CommandsList = [];

  for (const cmd of Commands.split("\n")) {
    if (!cmd.trim()) continue;

    try {
      CommandsList.push(await parseCommand(cmd));
    } catch (err) {
      ErrorLogger!.innerText = `In ${cmd}:\n  ${err}\n\n`;
      return;
    }
  }

  ErrorLogger!.innerText = "";

  const pdf = new PDFDocument({ size: "A4", margin: 0 });

  const PDFStream = pdf.pipe(blobStream());
  PDFStream.on("finish", function () {
    const url = PDFStream.toBlobURL("application/pdf");
    window.open(url);
  });

  let x = pdfSpacing;
  let y = pdfSpacing;

  for (let cmd of CommandsList) {
    for (let n = 0; n < cmd.count; ++n) {
      if (x > a4width || x + cmd.width > a4width) {
        y += cmd.height + pdfSpacing;
        x = pdfSpacing;
      }

      if (y > a4height || y + cmd.height > a4height) {
        pdf.addPage({ size: "A4", margin: 0 });
        x = y = pdfSpacing;
      }

      pdf.image(cmd.fileBuffer, x, y, { width: cmd.width, height: cmd.height });

      x += cmd.width + pdfSpacing;
    }

    x = pdfSpacing;
    y += cmd.height + pdfSpacing;
  }

  pdf.end();
};
