#!/usr/bin/env node

/**
 * JSON to Excel Converter for Tire Database
 * Converts tire-data.json (from scraper) to tire-database.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');

class JsonToExcelConverter {
    constructor() {
        this.jsonFile = 'tire-data.json';
        this.excelFile = 'tire-database.xlsx';
        this.workbook = XLSX.utils.book_new();
    }

    validateJsonFile() {
        if (!fs.existsSync(this.jsonFile)) {
            throw new Error(`JSON file not found: ${this.jsonFile}\nRun the tire scraper first: npm run scrape-all`);
        }
        console.log(`📄 Found JSON file: ${this.jsonFile}`);
    }

    readJsonData() {
        console.log('📖 Reading scraped tire data...');
        
        const jsonContent = fs.readFileSync(this.jsonFile, 'utf8');
        const tireData = JSON.parse(jsonContent);
        
        console.log(`📊 Loaded ${Object.keys(tireData).length} vehicles from scraper`);
        return tireData;
    }

    convertToExcelRows(tireData) {
        const rows = [
            ['Year', 'Make', 'Model', 'Primary Tire Size', 'Alternative Tire Size 1', 'Alternative Tire Size 2', 'Alternative Tire Size 3', 'Notes']
        ];

        Object.values(tireData).forEach(vehicle => {
            const tireSizes = vehicle.tireSizes || [];
            const row = [
                vehicle.year,
                vehicle.make,
                vehicle.model,
                tireSizes[0] || '',
                tireSizes[1] || '',
                tireSizes[2] || '',
                tireSizes[3] || '',
                `Scraped: ${new Date(vehicle.scrapedAt).toLocaleDateString()}`
            ];
            rows.push(row);
        });

        // Sort by year (newest first), then make, then model
        const dataRows = rows.slice(1);
        dataRows.sort((a, b) => {
            if (b[0] !== a[0]) return b[0] - a[0]; // Year descending
            if (a[1] !== b[1]) return a[1].localeCompare(b[1]); // Make ascending
            return a[2].localeCompare(b[2]); // Model ascending
        });

        return [rows[0], ...dataRows];
    }

    createMainSheet(tireData) {
        const rows = this.convertToExcelRows(tireData);
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 8 },   // Year
            { width: 18 },  // Make
            { width: 18 },  // Model
            { width: 18 },  // Primary Size
            { width: 18 },  // Alt Size 1
            { width: 18 },  // Alt Size 2
            { width: 18 },  // Alt Size 3
            { width: 25 }   // Notes
        ];

        // Style the header row
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "366092" } },
            alignment: { horizontal: "center" }
        };

        // Apply styles to header row
        for (let col = 0; col < 8; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) worksheet[cellAddress] = {};
            worksheet[cellAddress].s = headerStyle;
        }

        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Tire Database');
    }

    createStatsSheet(tireData) {
        const vehicles = Object.values(tireData);
        
        // Calculate statistics
        const years = new Set();
        const makes = new Set();
        const models = new Set();
        const makeCount = {};
        const yearCount = {};
        
        vehicles.forEach(vehicle => {
            years.add(vehicle.year);
            makes.add(vehicle.make);
            models.add(vehicle.model);
            
            makeCount[vehicle.make] = (makeCount[vehicle.make] || 0) + 1;
            yearCount[vehicle.year] = (yearCount[vehicle.year] || 0) + 1;
        });

        const statsData = [
            ['SCRAPED TIRE DATABASE STATISTICS'],
            [''],
            ['Generated:', new Date().toLocaleString()],
            ['Total Vehicles:', vehicles.length],
            ['Years Covered:', `${Math.min(...years)} - ${Math.max(...years)}`],
            ['Total Years:', years.size],
            ['Manufacturers:', makes.size],
            ['Unique Models:', models.size],
            [''],
            ['VEHICLES BY MANUFACTURER:'],
            ['']
        ];

        // Add manufacturer counts
        Object.entries(makeCount)
            .sort((a, b) => b[1] - a[1])
            .forEach(([make, count]) => {
                statsData.push([make, count]);
            });

        statsData.push(['']);
        statsData.push(['VEHICLES BY YEAR:']);
        statsData.push(['']);

        // Add year counts
        Object.entries(yearCount)
            .sort((a, b) => b[0] - a[0])
            .forEach(([year, count]) => {
                statsData.push([year, count]);
            });

        const worksheet = XLSX.utils.aoa_to_sheet(statsData);
        worksheet['!cols'] = [{ width: 30 }, { width: 15 }];

        // Style the title
        const titleStyle = {
            font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "366092" } },
            alignment: { horizontal: "center" }
        };
        
        if (worksheet['A1']) {
            worksheet['A1'].s = titleStyle;
        }

        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Statistics');
    }

    generateExcelFile(tireData) {
        console.log('📋 Creating Excel sheets...');
        
        this.createMainSheet(tireData);
        this.createStatsSheet(tireData);
        
        console.log('💾 Writing Excel file...');
        XLSX.writeFile(this.workbook, this.excelFile);
        
        console.log(`✅ Excel file created: ${this.excelFile}`);
    }

    convert() {
        try {
            console.log('🔄 Converting scraped JSON data to Excel...\n');
            
            this.validateJsonFile();
            const tireData = this.readJsonData();
            this.generateExcelFile(tireData);
            
            console.log('\n🎉 Conversion completed successfully!');
            console.log(`📈 ${Object.keys(tireData).length} vehicles converted to Excel format`);
            console.log('\n📝 You can now:');
            console.log('1. Open tire-database.xlsx to view/edit the data');
            console.log('2. Run: npm run excel-to-json to convert back to website format');
            console.log('3. Deploy the updated website');
            
        } catch (error) {
            console.error('\n❌ Conversion failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the converter if this file is executed directly
if (require.main === module) {
    const converter = new JsonToExcelConverter();
    converter.convert();
}

module.exports = JsonToExcelConverter;