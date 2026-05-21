/**
 * Creates a custom menu in the Google Sheets UI.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dista Tools')
    .addItem('Open Query Generator', 'showSidebar')
    .addToUi();
}

/**
 * Displays the stylized sidebar.
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(' ') 
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Generates SQL based on the value of Column C ({Value4}).
 */
function generateQueries(config) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return "No data found in sheet.";

  // Range A to H: Includes Value3 (A) through Value9 (H)
  const range = sheet.getRange("A2:H" + lastRow); 
  const data = range.getValues();
  const results = [];

  for (let i = 0; i < data.length; i++) {
    let [val3, val1, val4, val2, val6, val7, val8, val9] = data[i];
    
    if (!val3) {
      results.push([""]);
      continue;
    }

    // --- AUTOMATIC SCRIPT SELECTION LOGIC ---
    // If Value4 (Column C) is 'Unknown Site', use Script 2 (Extended)
    const useScript2 = (String(val4).trim() === "Unknown Site");
    
    // --- VALUE 1 LOGIC ---
    const isUnknownVal1 = (String(val1).trim() === "Unknown Site");

    // --- SET Clause Construction ---
    let setLines = [`outsideHomeLocation= FALSE`];
    
    if (isUnknownVal1) {
      setLines.push(`scanSiteName='${val9}'`, `userSiteName= '${val9}'`);
    } else {
      setLines.push(`scanSiteName='${val1}'`);
    }
    
    setLines.push(`levelId= '${val2}'`);
    
    // Auto-add fields if Script 2 is triggered by Value 4
    if (useScript2) {
      setLines.push(`state='${val6}'`, `country='${val7}_${val8}'`);
    }

    // --- WHERE Clause Construction ---
    let whereLines = [
      `email = '${val3}'`,
      `DATE(_PARTITIONTIME) > "${config.dateLimit}"`
    ];
    
    if (isUnknownVal1) {
      whereLines.push(`userSiteName='${val1}'`);
    } else {
      whereLines.push(`ScanSiteName='${val4}'`);
    }

    let finalQuery = `UPDATE\n  ${config.tableName}\nSET\n  ${setLines.join(',\n  ')}\nWHERE\n  ${whereLines.join('\n  AND ')};`;
    results.push([finalQuery]);
  }

  sheet.getRange(2, 9, results.length, 1).setValues(results);
  return "Success! Autonomous generation complete.";
}
