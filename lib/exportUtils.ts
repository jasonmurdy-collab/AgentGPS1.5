/**
 * Utility to convert an array of objects to a CSV string and trigger a download.
 */

export const downloadCsv = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // 1. Extract all unique keys from all objects to create headers
  const headers = Array.from(
    new Set(data.flatMap((obj) => Object.keys(obj)))
  );

  // 2. Build CSV rows
  const csvRows = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map((row) => {
      return headers
        .map((header) => {
          let value = row[header];

          // Handle null/undefined
          if (value === null || value === undefined) {
            value = '';
          }
          // Handle objects/arrays (stringifying them for the CSV cell)
          else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          // Escape quotes and commas
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(',');
    }),
  ];

  const csvString = csvRows.join('\n');

  // 3. Create a blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
