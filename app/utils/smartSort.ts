// Smart sorting function for option values
export const smartSort = (values: string[]): string[] => {
  // Common size patterns - expanded to include full words
  const sizeOrder = [
    'XXS', 'XS', 'EXTRA SMALL', 'X-SMALL', 'XSMALL',
    'S', 'SMALL',
    'M', 'MEDIUM', 'MED',
    'L', 'LARGE', 'LG',
    'XL', 'X-LARGE', 'XLARGE', 'EXTRA LARGE',
    'XXL', 'XX-LARGE', 'XXLARGE', 'EXTRA EXTRA LARGE',
    'XXXL', '3XL', 'XXX-LARGE', 'XXXLARGE',
    '4XL', '5XL'
  ];
  const numericSizeOrder = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40'];
  
  // Check if all values are clothing sizes
  const isClothingSizes = values.every(value => 
    sizeOrder.includes(value.toUpperCase()) || 
    /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+XL)$/i.test(value) ||
    /^(EXTRA\s+SMALL|SMALL|MEDIUM|LARGE|EXTRA\s+LARGE)$/i.test(value)
  );
  
  // Check if all values are numeric sizes
  const isNumericSizes = values.every(value => 
    /^\d+(\.\d+)?$/.test(value) || numericSizeOrder.includes(value)
  );
  
  // Check if all values are shoe sizes (including half sizes)
  const isShoeSizes = values.every(value => 
    /^\d+(\.\d+)?$/.test(value) && parseFloat(value) >= 3 && parseFloat(value) <= 20
  );
  
  if (isClothingSizes) {
    // Sort by clothing size order
    return values.sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase());
      const bIndex = sizeOrder.indexOf(b.toUpperCase());
      
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }
  
  if (isNumericSizes || isShoeSizes) {
    // Sort numerically
    return values.sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      return aNum - bNum;
    });
  }
  
  // Default alphabetical sort
  return values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};