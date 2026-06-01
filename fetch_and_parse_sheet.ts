import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import xlsx from 'xlsx';

async function fetchAndParse() {
  const url = 'https://docs.google.com/spreadsheets/d/1lwykV1XumuQLTbI_oF09F7MR_tLC_JhRtQmgaBAM7qM/export?format=xlsx';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Error fetching sheet:', res.status);
      return;
    }
    const buf = await res.arrayBuffer();
    const wb = xlsx.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:H100');

    console.log(`Successfully read Excel sheet. Range: A1 - H${range.e.r + 1}`);

    const lessonsList: any[] = [];

    for (let r = 1; r <= range.e.r; r++) {
      const getCellVal = (c: number) => {
        const addr = xlsx.utils.encode_cell({ r, c });
        const cell = ws[addr];
        return cell ? (cell.v !== undefined ? String(cell.v).trim() : '') : '';
      };

      const getCellLink = (c: number) => {
        const addr = xlsx.utils.encode_cell({ r, c });
        const cell = ws[addr];
        return cell && cell.l ? cell.l.Target : null;
      };

      const darsNoInput = getCellVal(0);
      if (!darsNoInput) continue;

      const darsNumMatch = darsNoInput.match(/(\d+)/);
      const lessonNumber = darsNumMatch ? parseInt(darsNumMatch[1], 10) : r;

      const platform = getCellVal(1);
      const title = getCellVal(2);
      const plan = getCellVal(3);
      const exercises = getCellVal(4);
      const goal = getCellVal(5);
      const rawDataField = getCellVal(6);
      const sources = getCellVal(7);

      const links: { title: string; url: string }[] = [];

      // Check if cells have explicit hyperlinks (.l)
      const linkG = getCellLink(6);
      const linkH = getCellLink(7);

      if (linkG) {
        links.push({ title: getCellVal(6).split(/\n/)[0].substring(0, 80) || 'Dars materiallari', url: linkG });
      }
      if (linkH) {
        links.push({ title: getCellVal(7).split(/\n/)[0].substring(0, 80) || 'Mavzu manbasi', url: linkH });
      }

      // Also parse regular URLs from the text
      const urlRegex = /(https?:\/\/[^\s\)\;\,\"\<\>]+)/g;
      const textG = getCellVal(6);
      const textH = getCellVal(7);

      const extractTextLinks = (text: string) => {
        const extraList: { title: string; url: string }[] = [];
        const linesList = text.split(/\n/);
        for (const line of linesList) {
          if (!line.trim()) continue;
          const urls = line.match(urlRegex);
          if (urls && urls.length > 0) {
            const urlStr = urls[0];
            let linkTitle = line.replace(urlStr, '').replace(/^-\s*/, '').replace(/:\s*$/, '').trim();
            if (!linkTitle) {
              linkTitle = 'Material havolasi';
            }
            extraList.push({ title: linkTitle, url: urlStr });
          }
        }
        return extraList;
      };

      const parsedG = extractTextLinks(textG);
      const parsedH = extractTextLinks(textH);

      const seenUrls = new Set(links.map(lk => lk.url));
      for (const lk of [...parsedG, ...parsedH]) {
        if (!seenUrls.has(lk.url)) {
          seenUrls.add(lk.url);
          links.push(lk);
        }
      }

      // Determine main PDF/drive resource URL with high precision
      let pdf_url = '';
      const driveLinks = links.filter(lk => lk.url.includes('drive.google.com') || lk.url.includes('/file/d/'));
      const directPdfLinks = links.filter(lk => lk.url.toLowerCase().includes('.pdf') || lk.url.toLowerCase().includes('.pptx') || lk.url.toLowerCase().includes('blob.core.windows.net') || lk.url.toLowerCase().includes('education.lego.com'));

      if (driveLinks.length > 0) {
        pdf_url = driveLinks[0].url;
      } else if (directPdfLinks.length > 0) {
        pdf_url = directPdfLinks[0].url;
      } else if (linkH && linkH.startsWith('http')) {
        pdf_url = linkH;
      } else if (linkG && linkG.startsWith('http')) {
        pdf_url = linkG;
      } else if (links.length > 0) {
        pdf_url = links[0].url;
      }

      lessonsList.push({
        id: `lesson_${lessonNumber}`,
        lessonNumber,
        lessonNoText: darsNoInput,
        platform,
        title,
        plan,
        exercises,
        goal,
        rawMaterials: rawDataField,
        links,
        sources,
        pdf_url,
        lesson_title: title
      });
    }

    // Sort by lesson number
    lessonsList.sort((a, b) => a.lessonNumber - b.lessonNumber);

    // Limit to 40 lessons or keep all 48 (having all 48 makes it more complete, but we'll show up to 48 or exactly 40 as wanted. Let's keep all 48 as some lessons might have been added and having the choice is wonderful!)
    console.log(`Generated ${lessonsList.length} structured lessons.`);
    
    // Create directory
    mkdirSync(path.join(process.cwd(), 'src', 'data'), { recursive: true });
    
    writeFileSync(
      path.join(process.cwd(), 'src', 'data', 'lessons_plan.json'),
      JSON.stringify(lessonsList, null, 2),
      'utf8'
    );
    console.log('Saved lessons plan JSON successfully!');

  } catch (err) {
    console.error('Error parsing sheet:', err);
  }
}

fetchAndParse();
