#!/usr/bin/env node

/**
 * Excel to JSON Converter for Tire Database
 * Converts tire-database.xlsx to tire-data.js for the website
 */

const XLSX = require('xlsx');
const fs = require('fs');

class ExcelToJsonConverter {
    constructor() {
        this.excelFile = 'tire-database.xlsx';
        this.jsonFile = 'tire-data.js';
        this.tireData = {};
    }

    validateExcelFile() {
        if (!fs.existsSync(this.excelFile)) {
            throw new Error(`Excel file not found: ${this.excelFile}\nRun: npm run create-template to create it first.`);
        }
        console.log(`📄 Found Excel file: ${this.excelFile}`);
    }

    readExcelData() {
        console.log('📖 Reading Excel data...');
        
        const workbook = XLSX.readFile(this.excelFile);
        const sheetName = 'Tire Database';
        
        if (!workbook.Sheets[sheetName]) {
            throw new Error(`Sheet "${sheetName}" not found in Excel file`);
        }

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Skip header row
        return data.slice(1);
    }

    parseRowData(row) {
        const [year, make, model, primarySize, altSize1, altSize2, altSize3, notes] = row;
        
        // Skip empty rows
        if (!year || !make || !model || !primarySize) {
            return null;
        }

        // Validate year
        const parsedYear = parseInt(year);
        if (isNaN(parsedYear) || parsedYear < 1990 || parsedYear > 2030) {
            console.warn(`⚠️  Invalid year: ${year} for ${make} ${model}`);
            return null;
        }

        // Clean up tire sizes
        const tireSizes = [primarySize, altSize1, altSize2, altSize3]
            .filter(size => size && size.trim())
            .map(size => size.trim());

        if (tireSizes.length === 0) {
            console.warn(`⚠️  No tire sizes for ${parsedYear} ${make} ${model}`);
            return null;
        }

        return {
            year: parsedYear,
            make: make.trim(),
            model: model.trim(),
            tireSizes: tireSizes,
            primarySize: tireSizes[0],
            notes: notes ? notes.trim() : '',
            scrapedAt: new Date().toISOString()
        };
    }

    convertExcelToJson() {
        const rows = this.readExcelData();
        let processedCount = 0;
        let skippedCount = 0;

        console.log(`🔄 Processing ${rows.length} rows...`);

        rows.forEach((row, index) => {
            const vehicleData = this.parseRowData(row);
            
            if (vehicleData) {
                const key = `${vehicleData.year}_${vehicleData.make}_${vehicleData.model}`;
                this.tireData[key] = vehicleData;
                processedCount++;
                
                if (processedCount % 10 === 0) {
                    console.log(`✓ Processed ${processedCount} vehicles...`);
                }
            } else {
                skippedCount++;
            }
        });

        console.log(`✅ Processing complete!`);
        console.log(`📊 Processed: ${processedCount} vehicles`);
        console.log(`⏭️  Skipped: ${skippedCount} empty/invalid rows`);
    }

    generateJavaScriptFile() {
        console.log('💾 Generating JavaScript file...');

        const vehicleCount = Object.keys(this.tireData).length;
        const lastUpdated = new Date().toISOString();

        const jsContent = `// Tire Database - Generated from Excel
// Generated: ${lastUpdated}
// Total vehicles: ${vehicleCount}
// Source: tire-database.xlsx

const scrapedTireData = ${JSON.stringify(this.tireData, null, 2)};

// Export for use in tire-finder.html
if (typeof module !== 'undefined' && module.exports) {
    module.exports = scrapedTireData;
}

// Statistics
console.log(\`🚗 Loaded tire data for \${Object.keys(scrapedTireData).length} vehicles from Excel database\`);
`;

        fs.writeFileSync(this.jsonFile, jsContent);
        console.log(`✅ JavaScript file created: ${this.jsonFile}`);
    }

    generateStats() {
        const years = new Set();
        const makes = new Set();
        const models = new Set();

        Object.values(this.tireData).forEach(vehicle => {
            years.add(vehicle.year);
            makes.add(vehicle.make);
            models.add(vehicle.model);
        });

        console.log('\n📈 Database Statistics:');
        console.log(`• Total vehicles: ${Object.keys(this.tireData).length}`);
        console.log(`• Years covered: ${Math.min(...years)} - ${Math.max(...years)} (${years.size} years)`);
        console.log(`• Manufacturers: ${makes.size}`);
        console.log(`• Unique models: ${models.size}`);
        
        console.log('\n🏭 Top manufacturers:');
        const makeCount = {};
        Object.values(this.tireData).forEach(vehicle => {
            makeCount[vehicle.make] = (makeCount[vehicle.make] || 0) + 1;
        });
        
        Object.entries(makeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([make, count]) => {
                console.log(`   ${make}: ${count} vehicles`);
            });
    }

    convert() {
        try {
            console.log('🔄 Converting Excel tire database to JSON...\n');
            
            this.validateExcelFile();
            this.convertExcelToJson();
            this.generateJavaScriptFile();
            this.generateStats();
            
            console.log('\n🎉 Conversion completed successfully!');
            console.log('\n📝 Next steps:');
            console.log('1. Test your tire finder locally');
            console.log('2. Deploy the updated website');
            console.log('3. Add more vehicle data to the Excel file as needed');
            
        } catch (error) {
            console.error('\n❌ Conversion failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the converter if this file is executed directly
if (require.main === module) {
    const converter = new ExcelToJsonConverter();
    converter.convert();
}

module.exports = ExcelToJsonConverter;