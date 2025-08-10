#!/usr/bin/env node

/**
 * Create Tire Database Excel Template
 * Generates a pre-formatted Excel file for manual tire data entry
 */

const XLSX = require('xlsx');

class TireTemplateGenerator {
    constructor() {
        this.workbook = XLSX.utils.book_new();
        this.currentYear = new Date().getFullYear();
    }

    createMainSheet() {
        // Sample data to show the format
        const sampleData = [
            ['Year', 'Make', 'Model', 'Primary Tire Size', 'Alternative Tire Size 1', 'Alternative Tire Size 2', 'Alternative Tire Size 3', 'Notes'],
            // Current year examples
            [2025, 'Honda', 'Civic', '215/55R16', '235/40R18', '215/50R17', '', 'Base model uses 215/55R16'],
            [2025, 'Toyota', 'Camry', '215/55R17', '235/45R18', '', '', 'LE and XLE models'],
            [2025, 'Ford', 'F-150', 'LT275/65R18', 'LT275/70R17', 'P255/70R17', '', 'Regular Cab and SuperCrew'],
            [2025, 'Chevrolet', 'Silverado', 'LT275/65R18', 'LT265/70R17', 'P255/70R16', '', 'Work Truck and LT trim'],
            [2025, 'Honda', 'CR-V', '225/65R17', '235/60R18', '', '', 'LX and EX models'],
            [2025, 'Toyota', 'RAV4', '225/65R17', '225/60R18', '235/55R19', '', 'LE, XLE, and Limited trims'],
            [2025, 'Jeep', 'Wrangler', '255/75R17', '285/70R17', '315/70R17', '', 'Sport, Sahara, Rubicon'],
            [2025, 'Ford', 'Explorer', '255/50R20', '245/60R18', '265/45R21', '', 'Base, XLT, Limited trims'],
            [2025, 'Nissan', 'Altima', '215/55R17', '235/40R19', '', '', 'S and SR models'],
            [2025, 'RAM', '1500', 'LT275/65R18', 'LT275/60R20', 'P255/70R16', '', 'Tradesman and Big Horn'],
            
            // Previous years examples
            [2024, 'Honda', 'Civic', '215/55R16', '235/40R18', '215/50R17', '', ''],
            [2024, 'Toyota', 'Camry', '215/55R17', '235/45R18', '', '', ''],
            [2023, 'Ford', 'F-150', 'LT275/65R18', 'LT275/70R17', '', '', ''],
            [2023, 'Chevrolet', 'Silverado', 'LT275/65R18', 'LT265/70R17', '', '', ''],
            [2022, 'Honda', 'Accord', '215/55R17', '235/40R19', '', '', ''],
            [2022, 'Toyota', 'Corolla', '205/55R16', '215/45R17', '', '', ''],
            [2021, 'Ford', 'Mustang', '235/55R17', '255/40R19', '275/35R20', '', ''],
            [2021, 'BMW', '3 Series', '225/50R17', '225/45R18', '255/35R19', '', ''],
            [2020, 'Mercedes-Benz', 'C-Class', '225/55R17', '225/45R18', '255/35R19', '', ''],
            [2020, 'Audi', 'A4', '225/55R17', '245/40R18', '255/35R19', '', ''],
            
            // Empty rows for manual entry
            ['', '', '', '', '', '', '', 'Add your vehicle data below:'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 8 },   // Year
            { width: 15 },  // Make
            { width: 15 },  // Model
            { width: 15 },  // Primary Size
            { width: 15 },  // Alt Size 1
            { width: 15 },  // Alt Size 2
            { width: 15 },  // Alt Size 3
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

    createInstructionsSheet() {
        const instructions = [
            ['TIRE DATABASE INSTRUCTIONS'],
            [''],
            ['HOW TO USE THIS TEMPLATE:'],
            [''],
            ['1. YEAR: Enter the model year (e.g., 2025, 2024, 2023)'],
            ['2. MAKE: Enter the vehicle manufacturer (e.g., Honda, Toyota, Ford)'],
            ['3. MODEL: Enter the vehicle model (e.g., Civic, Camry, F-150)'],
            ['4. PRIMARY TIRE SIZE: Most common tire size for that vehicle'],
            ['5. ALTERNATIVE SIZES: Other available tire sizes (optional)'],
            ['6. NOTES: Any additional information about trims or options'],
            [''],
            ['TIRE SIZE FORMAT EXAMPLES:'],
            ['• 215/55R16 (Passenger car tires)'],
            ['• LT275/65R18 (Light truck tires - starts with LT)'],
            ['• P225/60R17 (P-metric tires - starts with P)'],
            ['• 255/35R19 (Ultra-high performance)'],
            [''],
            ['COMMON TIRE SIZE BREAKDOWN:'],
            ['215/55R16 means:'],
            ['• 215 = Width in millimeters'],
            ['• 55 = Aspect ratio (sidewall height as % of width)'],
            ['• R = Radial construction'],
            ['• 16 = Wheel diameter in inches'],
            [''],
            ['TIPS FOR ACCURACY:'],
            ['• Check multiple trim levels - they often have different sizes'],
            ['• Verify with manufacturer specifications'],
            ['• Consider both base and upgraded wheel packages'],
            ['• Note any regional differences'],
            [''],
            ['AFTER FILLING OUT THE DATA:'],
            ['1. Save this Excel file as "tire-database.xlsx"'],
            ['2. Run: npm run excel-to-json'],
            ['3. This will convert your Excel data to JSON for the website'],
            ['4. Deploy the updated website with the new tire data'],
            [''],
            ['DATA SOURCES:'],
            ['• Manufacturer websites'],
            ['• Owner manuals'],
            ['• Tire information placards on vehicles'],
            ['• Reputable tire retailer websites'],
            ['• Vehicle specification databases']
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(instructions);
        
        // Set column width
        worksheet['!cols'] = [{ width: 60 }];

        // Style the title
        const titleStyle = {
            font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "366092" } },
            alignment: { horizontal: "center" }
        };
        
        if (worksheet['A1']) {
            worksheet['A1'].s = titleStyle;
        }

        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Instructions');
    }

    createPopularVehiclesSheet() {
        const popularVehicles = [
            ['POPULAR VEHICLES TO PRIORITIZE'],
            [''],
            ['TOP SELLING VEHICLES IN THE US:'],
            [''],
            ['PICKUP TRUCKS:'],
            ['Ford F-150', 'Chevrolet Silverado', 'RAM 1500', 'GMC Sierra'],
            ['Toyota Tacoma', 'Chevrolet Colorado', 'Honda Ridgeline', 'Nissan Titan'],
            [''],
            ['SUVs:'],
            ['Honda CR-V', 'Toyota RAV4', 'Ford Explorer', 'Jeep Grand Cherokee'],
            ['Chevrolet Equinox', 'Toyota Highlander', 'Ford Escape', 'Jeep Wrangler'],
            ['Nissan Rogue', 'Subaru Outback', 'Honda Pilot', 'Toyota 4Runner'],
            [''],
            ['SEDANS:'],
            ['Toyota Camry', 'Honda Accord', 'Nissan Altima', 'Honda Civic'],
            ['Toyota Corolla', 'Chevrolet Malibu', 'Hyundai Sonata', 'Kia Forte'],
            [''],
            ['LUXURY VEHICLES:'],
            ['BMW 3 Series', 'Mercedes-Benz C-Class', 'Audi A4', 'Lexus ES'],
            ['BMW X3', 'Mercedes-Benz GLC', 'Audi Q5', 'Lexus RX'],
            [''],
            ['ELECTRIC VEHICLES:'],
            ['Tesla Model 3', 'Tesla Model Y', 'Chevrolet Bolt', 'Nissan Leaf'],
            ['Ford Mustang Mach-E', 'Hyundai Ioniq 5', 'Kia EV6'],
            [''],
            ['FOCUS ON RECENT YEARS:'],
            ['Start with 2020-2025 model years for maximum relevance'],
            ['Add older years (2015-2019) based on customer demand'],
            ['Consider discontinued models that are still common on roads']
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(popularVehicles);
        worksheet['!cols'] = [{ width: 50 }];

        // Style the title
        const titleStyle = {
            font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "366092" } },
            alignment: { horizontal: "center" }
        };
        
        if (worksheet['A1']) {
            worksheet['A1'].s = titleStyle;
        }

        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Popular Vehicles');
    }

    generateTemplate() {
        console.log('🔧 Creating tire database Excel template...');
        
        this.createMainSheet();
        this.createInstructionsSheet();
        this.createPopularVehiclesSheet();
        
        const filename = 'tire-database.xlsx';
        XLSX.writeFile(this.workbook, filename);
        
        console.log(`✅ Template created: ${filename}`);
        console.log('');
        console.log('📝 Next steps:');
        console.log('1. Open tire-database.xlsx in Excel or Google Sheets');
        console.log('2. Fill in tire data for your desired vehicles');
        console.log('3. Save the file');
        console.log('4. Run: npm run excel-to-json');
        console.log('5. Deploy the updated website');
        console.log('');
        console.log('💡 Check the "Instructions" and "Popular Vehicles" sheets for guidance');
    }
}

// Run the template generator if this file is executed directly
if (require.main === module) {
    try {
        const generator = new TireTemplateGenerator();
        generator.generateTemplate();
    } catch (error) {
        console.error('❌ Error creating template:', error.message);
        process.exit(1);
    }
}

module.exports = TireTemplateGenerator;