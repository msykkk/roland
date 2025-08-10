#!/usr/bin/env node

/**
 * Comprehensive TireRack Scraper
 * Extracts EVERY vehicle (year, make, model) from TireRack.com
 * With 0.1 second delays as requested by user
 */

const { JSDOM } = require('jsdom');
const XLSX = require('xlsx');
const fs = require('fs');

class ComprehensiveTireRackScraper {
    constructor() {
        this.delay = 100; // 0.1 seconds as explicitly requested
        this.baseUrl = 'https://www.tirerack.com';
        this.vehicleData = [];
        this.processedCount = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
        
        // Create workbook for Excel output
        this.workbook = XLSX.utils.book_new();
        
        console.log('🔍 Comprehensive TireRack Scraper Starting...');
        console.log(`⏱️  Using ${this.delay}ms (0.1s) delays between requests`);
        console.log('📋 Will extract EVERY vehicle from TireRack systematically\n');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchPage(url) {
        try {
            console.log(`🌐 Fetching: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const dom = new JSDOM(html);
            
            // Wait 0.1 seconds before next request
            await this.sleep(this.delay);
            
            return dom.window.document;
            
        } catch (error) {
            console.error(`❌ Error fetching ${url}: ${error.message}`);
            this.errorCount++;
            return null;
        }
    }

    async extractYears() {
        console.log('📅 Step 1: Extracting all available years...');
        
        const doc = await this.fetchPage(`${this.baseUrl}/tires/TireSearchResults.jsp`);
        if (!doc) return [];

        const yearElements = doc.querySelectorAll('select[name="year"] option, #year option, select#vehicleYear option');
        const years = [];

        yearElements.forEach(option => {
            const year = parseInt(option.value);
            if (year && year >= 1990 && year <= 2025) {
                years.push(year);
            }
        });

        // If no years found, create comprehensive range
        if (years.length === 0) {
            console.log('⚠️  No year dropdown found, using comprehensive range 1990-2025');
            for (let year = 1990; year <= 2025; year++) {
                years.push(year);
            }
        }

        years.sort((a, b) => b - a); // Most recent first
        console.log(`✅ Found ${years.length} years: ${years.slice(0, 5).join(', ')}${years.length > 5 ? '...' : ''}`);
        return years;
    }

    async extractMakesForYear(year) {
        console.log(`🏭 Step 2: Extracting makes for year ${year}...`);
        
        const searchUrl = `${this.baseUrl}/tires/TireSearchResults.jsp?year=${year}`;
        const doc = await this.fetchPage(searchUrl);
        if (!doc) return [];

        const makes = new Set();
        
        // Try multiple selectors for make dropdown
        const makeSelectors = [
            'select[name="make"] option',
            '#make option',
            'select#vehicleMake option',
            '.make-selector option'
        ];

        for (const selector of makeSelectors) {
            const makeElements = doc.querySelectorAll(selector);
            makeElements.forEach(option => {
                const make = option.textContent?.trim();
                if (make && make !== '' && make !== 'Select Make' && make !== 'Choose Make') {
                    makes.add(make);
                }
            });
            
            if (makes.size > 0) break;
        }

        // If no makes found through selectors, try extracting from JavaScript
        if (makes.size === 0) {
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => {
                const content = script.textContent || '';
                
                // Look for make data in JavaScript variables
                const makeMatches = content.match(/makes?\s*[=:]\s*\[([^\]]+)\]/gi);
                if (makeMatches) {
                    makeMatches.forEach(match => {
                        const makeList = match.match(/["']([^"']+)["']/g);
                        if (makeList) {
                            makeList.forEach(makeItem => {
                                const make = makeItem.replace(/["']/g, '').trim();
                                if (make.length > 1) makes.add(make);
                            });
                        }
                    });
                }
            });
        }

        // Fallback: comprehensive make list if nothing found
        if (makes.size === 0) {
            console.log(`⚠️  No makes found for ${year}, using comprehensive fallback list`);
            const fallbackMakes = [
                'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
                'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar',
                'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz',
                'Mitsubishi', 'Nissan', 'Plymouth', 'Pontiac', 'Porsche', 'RAM',
                'Saab', 'Saturn', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
            ];
            fallbackMakes.forEach(make => makes.add(make));
        }

        const makeArray = Array.from(makes).sort();
        console.log(`✅ Found ${makeArray.length} makes for ${year}: ${makeArray.slice(0, 3).join(', ')}${makeArray.length > 3 ? '...' : ''}`);
        return makeArray;
    }

    async extractModelsForYearMake(year, make) {
        console.log(`🚗 Step 3: Extracting models for ${year} ${make}...`);
        
        const searchUrl = `${this.baseUrl}/tires/TireSearchResults.jsp?year=${year}&make=${encodeURIComponent(make)}`;
        const doc = await this.fetchPage(searchUrl);
        if (!doc) return [];

        const models = new Set();
        
        // Try multiple selectors for model dropdown
        const modelSelectors = [
            'select[name="model"] option',
            '#model option',
            'select#vehicleModel option',
            '.model-selector option'
        ];

        for (const selector of modelSelectors) {
            const modelElements = doc.querySelectorAll(selector);
            modelElements.forEach(option => {
                const model = option.textContent?.trim();
                if (model && model !== '' && model !== 'Select Model' && model !== 'Choose Model') {
                    models.add(model);
                }
            });
            
            if (models.size > 0) break;
        }

        // Try extracting from JavaScript if no models found
        if (models.size === 0) {
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => {
                const content = script.textContent || '';
                
                const modelMatches = content.match(/models?\s*[=:]\s*\[([^\]]+)\]/gi);
                if (modelMatches) {
                    modelMatches.forEach(match => {
                        const modelList = match.match(/["']([^"']+)["']/g);
                        if (modelList) {
                            modelList.forEach(modelItem => {
                                const model = modelItem.replace(/["']/g, '').trim();
                                if (model.length > 1) models.add(model);
                            });
                        }
                    });
                }
            });
        }

        const modelArray = Array.from(models).sort();
        if (modelArray.length > 0) {
            console.log(`✅ Found ${modelArray.length} models for ${year} ${make}: ${modelArray.slice(0, 3).join(', ')}${modelArray.length > 3 ? '...' : ''}`);
        } else {
            console.log(`⚠️  No models found for ${year} ${make}`);
        }
        
        return modelArray;
    }

    async extractTireSizesForVehicle(year, make, model) {
        console.log(`🛞 Step 4: Extracting tire sizes for ${year} ${make} ${model}...`);
        
        const searchUrl = `${this.baseUrl}/tires/TireSearchResults.jsp?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
        const doc = await this.fetchPage(searchUrl);
        if (!doc) return [];

        const tireSizes = new Set();
        
        // Look for tire sizes in various places
        const tireSizeSelectors = [
            '.tire-size',
            '.size-option',
            '.tire-specification',
            '.size-text',
            'select[name="size"] option',
            '.tire-results .size'
        ];

        for (const selector of tireSizeSelectors) {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(element => {
                const text = element.textContent?.trim();
                if (text) {
                    // Extract tire size pattern (e.g., 225/60R16)
                    const sizeMatches = text.match(/\b\d{3}\/\d{2}[A-Z]?\d{2}\b/g);
                    if (sizeMatches) {
                        sizeMatches.forEach(size => tireSizes.add(size));
                    }
                }
            });
        }

        // Also check in JavaScript and page text
        const allText = doc.body?.textContent || '';
        const allSizeMatches = allText.match(/\b\d{3}\/\d{2}[A-Z]?\d{2}\b/g);
        if (allSizeMatches) {
            allSizeMatches.forEach(size => tireSizes.add(size));
        }

        const sizeArray = Array.from(tireSizes).sort();
        if (sizeArray.length > 0) {
            console.log(`✅ Found ${sizeArray.length} tire sizes: ${sizeArray.join(', ')}`);
        }
        
        return sizeArray;
    }

    async scrapeAllVehicles() {
        const years = await this.extractYears();
        if (years.length === 0) {
            console.error('❌ No years found, cannot continue');
            return;
        }

        console.log(`\n🎯 Starting comprehensive scrape of ALL TireRack vehicles...`);
        console.log(`📊 Estimated vehicles to process: ${years.length} years × average 25 makes × average 15 models = ~${years.length * 25 * 15} vehicles`);
        console.log(`⏱️  Estimated time: ~${Math.round((years.length * 25 * 15 * this.delay) / 1000 / 60)} minutes with 0.1s delays\n`);

        for (const year of years) {
            console.log(`\n📅 Processing year ${year}...`);
            
            const makes = await this.extractMakesForYear(year);
            if (makes.length === 0) {
                console.log(`⚠️  Skipping ${year} - no makes found`);
                continue;
            }

            for (const make of makes) {
                console.log(`\n🏭 Processing ${year} ${make}...`);
                
                const models = await this.extractModelsForYearMake(year, make);
                if (models.length === 0) {
                    console.log(`⚠️  Skipping ${year} ${make} - no models found`);
                    continue;
                }

                for (const model of models) {
                    try {
                        console.log(`\n🚗 Processing ${year} ${make} ${model}...`);
                        
                        const tireSizes = await this.extractTireSizesForVehicle(year, make, model);
                        
                        // Add vehicle to database even if no tire sizes found
                        const vehicleEntry = {
                            year: year,
                            make: make,
                            model: model,
                            primarySize: tireSizes[0] || '',
                            altSize1: tireSizes[1] || '',
                            altSize2: tireSizes[2] || '',
                            altSize3: tireSizes[3] || '',
                            allSizes: tireSizes.join(', '),
                            sizeCount: tireSizes.length,
                            scrapedAt: new Date().toISOString(),
                            source: 'TireRack.com'
                        };

                        this.vehicleData.push(vehicleEntry);
                        this.processedCount++;

                        const elapsed = (Date.now() - this.startTime) / 1000;
                        const rate = this.processedCount / elapsed;
                        console.log(`✅ Processed ${this.processedCount} vehicles (${rate.toFixed(2)}/sec) - ${year} ${make} ${model}`);
                        
                        // Save progress every 50 vehicles
                        if (this.processedCount % 50 === 0) {
                            await this.saveProgressToExcel();
                            console.log(`💾 Progress saved - ${this.processedCount} vehicles processed so far`);
                        }

                    } catch (error) {
                        console.error(`❌ Error processing ${year} ${make} ${model}: ${error.message}`);
                        this.errorCount++;
                    }
                }
            }
        }

        await this.saveProgressToExcel();
        this.printFinalStats();
    }

    async saveProgressToExcel() {
        console.log('💾 Saving comprehensive vehicle data to Excel...');

        // Prepare data for Excel
        const headers = ['Year', 'Make', 'Model', 'Primary Tire Size', 'Alt Size 1', 'Alt Size 2', 'Alt Size 3', 'All Sizes', 'Size Count', 'Scraped At', 'Source'];
        
        const excelData = [headers];
        
        this.vehicleData.forEach(vehicle => {
            excelData.push([
                vehicle.year,
                vehicle.make,
                vehicle.model,
                vehicle.primarySize,
                vehicle.altSize1,
                vehicle.altSize2,
                vehicle.altSize3,
                vehicle.allSizes,
                vehicle.sizeCount,
                vehicle.scrapedAt,
                vehicle.source
            ]);
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 8 },   // Year
            { width: 18 },  // Make
            { width: 25 },  // Model
            { width: 18 },  // Primary Size
            { width: 18 },  // Alt Size 1
            { width: 18 },  // Alt Size 2
            { width: 18 },  // Alt Size 3
            { width: 40 },  // All Sizes
            { width: 12 },  // Size Count
            { width: 20 },  // Scraped At
            { width: 15 }   // Source
        ];

        // Clear workbook and add new sheet
        this.workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Complete TireRack Database');

        // Save to file
        const filename = 'tire-database.xlsx';
        XLSX.writeFile(this.workbook, filename);
        
        console.log(`✅ Saved ${this.vehicleData.length} vehicles to ${filename}`);
    }

    printFinalStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);

        console.log('\n' + '='.repeat(80));
        console.log('🎉 COMPREHENSIVE TIRERACK SCRAPE COMPLETED!');
        console.log('='.repeat(80));
        console.log(`📊 Total vehicles processed: ${this.processedCount.toLocaleString()}`);
        console.log(`⏱️  Total time: ${minutes}m ${seconds}s`);
        console.log(`🚀 Average rate: ${(this.processedCount / elapsed).toFixed(2)} vehicles/second`);
        console.log(`❌ Errors encountered: ${this.errorCount}`);
        console.log(`💾 Data saved to: tire-database.xlsx`);
        
        // Statistics by manufacturer
        const makeCount = {};
        const yearCount = {};
        let vehiclesWithTires = 0;
        
        this.vehicleData.forEach(vehicle => {
            makeCount[vehicle.make] = (makeCount[vehicle.make] || 0) + 1;
            yearCount[vehicle.year] = (yearCount[vehicle.year] || 0) + 1;
            if (vehicle.sizeCount > 0) vehiclesWithTires++;
        });

        console.log('\n📈 TOP 10 MANUFACTURERS:');
        Object.entries(makeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([make, count], index) => {
                console.log(`${(index + 1).toString().padStart(2)}. ${make}: ${count.toLocaleString()} vehicles`);
            });

        console.log(`\n🛞 Vehicles with tire size data: ${vehiclesWithTires.toLocaleString()} (${((vehiclesWithTires/this.processedCount)*100).toFixed(1)}%)`);
        console.log(`📅 Year range: ${Math.min(...Object.keys(yearCount).map(Number))} - ${Math.max(...Object.keys(yearCount).map(Number))}`);
        
        console.log('\n📝 NEXT STEPS:');
        console.log('1. Run: npm run excel-to-json');
        console.log('2. Deploy updated website with complete TireRack database');
        console.log('3. Your tire finder now has EVERY vehicle from TireRack!');
        console.log('='.repeat(80));
    }

    async run() {
        try {
            await this.scrapeAllVehicles();
        } catch (error) {
            console.error(`❌ Critical error: ${error.message}`);
            await this.saveProgressToExcel();
            process.exit(1);
        }
    }
}

// Run the comprehensive scraper if this file is executed directly
if (require.main === module) {
    const scraper = new ComprehensiveTireRackScraper();
    scraper.run();
}

module.exports = ComprehensiveTireRackScraper;