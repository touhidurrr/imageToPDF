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
};

function expressionToPoints(expr) {
  let unitToPoints = 1;
  for (let unit of Object.keys(unitsToPointsList)) {
    if (expr.endsWith(unit)) {
      unitToPoints = unitsToPointsList[unit];
      expr = expr.slice(0, -unit.length);
      continue;
    }
  }
  return Number(expr) * unitToPoints * pdfSizeModifier;
}

async function parseCommand(cmd) {
  cmd = cmd.replace(/\s+/g, '').toLowerCase();

  commandRegex = /^image\d+,\d+,[\d.]+(|"|inch|in|mm|cm)[x*][\d.]+(|"|inch|in|mm|cm)$/;
  if (!commandRegex.test(cmd)) {
    throw 'Cannot recognize the command!';
  }

  let [image, count, size] = cmd.split(',');

  count = Number(count);

  let serial = Number(image.slice(5));

  if (serial > FileList.length) {
    throw `${image} does not exist!`;
  }

  let fileBuffer = await FileList[serial - 1].arrayBuffer();

  let [width, height] = size.split(/[x*]/);

  width = expressionToPoints(width);
  if (width > a4width) {
    throw 'Max allowed width ${a4width}, given ${width} ...';
  }

  height = expressionToPoints(height);
  if (height > a4height) {
    throw 'Max allowed height ${a4height}, given ${height} ...';
  }

  return { fileBuffer, count, width, height };
}

async function makePDF() {
  window.ErrorLogger = document.getElementById('errors');
  window.FileList = document.getElementById('files').files;
  const Commands = document.getElementById('commands').value.trim();

  let CommandsList = [];

  for (const cmd of Commands.split('\n')) {
    if (!cmd.trim()) continue;

    try {
      CommandsList.push(await parseCommand(cmd));
    } catch (err) {
      ErrorLogger.innerText = `In ${cmd}:\n  ${err}\n\n`;
      return;
    }
  }

  ErrorLogger.innerText = '';

  const pdf = new PDFDocument({ size: 'A4', margin: 0 });

  const PDFStream = pdf.pipe(blobStream());
  PDFStream.on('finish', function () {
    const url = PDFStream.toBlobURL('application/pdf');
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
        pdf.addPage({ size: 'A4', margin: 0 });
        x = y = pdfSpacing;
      }

      pdf.image(cmd.fileBuffer, x, y, { width: cmd.width, height: cmd.height });

      x += cmd.width + pdfSpacing;
    }

    x = pdfSpacing;
    y += cmd.height + pdfSpacing;
  }

  pdf.end();
}
