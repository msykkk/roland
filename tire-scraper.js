#!/usr/bin/env node

/**
 * TireRack Scraper - Collects accurate tire fitment data
 * Delay: 0.1 seconds between requests (as requested)
 * Usage: node tire-scraper.js
 */

const https = require('https');
const fs = require('fs');
const { JSDOM } = require('jsdom');

class TireRackScraper {
    constructor() {
        this.delay = 100; // 0.1 seconds as requested
        this.baseUrl = 'https://www.tirerack.com';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.tireData = {};
        this.requestCount = 0;
        this.startTime = Date.now();
    }

    // Sleep function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Make HTTP request with proper headers
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            };

            https.get(url, options, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    this.requestCount++;
                    if (this.requestCount % 10 === 0) {
                        const elapsed = (Date.now() - this.startTime) / 1000;
                        console.log(`✓ ${this.requestCount} requests in ${elapsed.toFixed(1)}s (${(this.requestCount/elapsed).toFixed(1)} req/sec)`);
                    }
                    resolve(data);
                });
            }).on('error', (error) => {
                console.error(`❌ Request failed: ${error.message}`);
                reject(error);
            });
        });
    }

    // Extract tire sizes from TireRack vehicle page
    extractTireSizes(html, vehicle) {
        try {
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const tireSizes = new Set();
            
            // Look for tire size patterns in the HTML
            const tireSizeRegex = /(\d{3}\/\d{2}R\d{2}|\d{3}\/\d{2}-\d{2}|P\d{3}\/\d{2}R\d{2})/g;
            const matches = html.match(tireSizeRegex);
            
            if (matches) {
                matches.forEach(size => {
                    // Clean up the tire size format
                    const cleanSize = size.replace(/^P/, ''); // Remove P prefix if present
                    tireSizes.add(cleanSize);
                });
            }

            // Also look for tire sizes in specific elements
            const sizeElements = document.querySelectorAll('.tire-size, .size, [data-size]');
            sizeElements.forEach(element => {
                const text = element.textContent.trim();
                const match = text.match(tireSizeRegex);
                if (match) {
                    tireSizes.add(match[0].replace(/^P/, ''));
                }
            });

            return Array.from(tireSizes);
        } catch (error) {
            console.error(`❌ Error extracting tire sizes for ${vehicle.year} ${vehicle.make} ${vehicle.model}: ${error.message}`);
            return [];
        }
    }

    // Get tire sizes for a specific vehicle
    async getVehicleTireSizes(vehicle) {
        try {
            // TireRack URL format for vehicle tire lookup
            const url = `${this.baseUrl}/tires/TireSearchResults.jsp?tireIndex=1&autoMake=${encodeURIComponent(vehicle.make)}&autoModel=${encodeURIComponent(vehicle.model)}&autoYear=${vehicle.year}&autoModClar=`;
            
            console.log(`🔍 Scraping: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
            
            const html = await this.makeRequest(url);
            const tireSizes = this.extractTireSizes(html, vehicle);
            
            if (tireSizes.length > 0) {
                const key = `${vehicle.year}_${vehicle.make}_${vehicle.model}`;
                this.tireData[key] = {
                    year: vehicle.year,
                    make: vehicle.make,
                    model: vehicle.model,
                    tireSizes: tireSizes,
                    primarySize: tireSizes[0], // Most common size first
                    scrapedAt: new Date().toISOString()
                };
                
                console.log(`✅ Found ${tireSizes.length} tire sizes for ${vehicle.year} ${vehicle.make} ${vehicle.model}: ${tireSizes.join(', ')}`);
            } else {
                console.log(`⚠️  No tire sizes found for ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
            }
            
            // 0.1 second delay as requested
            await this.sleep(this.delay);
            
        } catch (error) {
            console.error(`❌ Error scraping ${vehicle.year} ${vehicle.make} ${vehicle.model}: ${error.message}`);
            await this.sleep(this.delay * 2); // Double delay on error
        }
    }

    // Popular vehicles list to scrape first
    getPopularVehicles() {
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
        const vehicles = [];

        const popularModels = {
            'Ford': ['F-150', 'Escape', 'Explorer', 'Mustang', 'Focus', 'Fusion', 'Edge'],
            'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Cruze', 'Traverse', 'Impala'],
            'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Tacoma', '4Runner', 'Sienna'],
            'Honda': ['Accord', 'Civic', 'CR-V', 'Pilot', 'Fit', 'Odyssey', 'Ridgeline', 'HR-V'],
            'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Maxima', 'Murano', 'Titan', 'Versa'],
            'Jeep': ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator'],
            'RAM': ['1500', '2500', '3500', 'ProMaster'],
            'GMC': ['Sierra', 'Acadia', 'Terrain', 'Yukon', 'Canyon']
        };

        // Create vehicle combinations
        years.forEach(year => {
            Object.entries(popularModels).forEach(([make, models]) => {
                models.forEach(model => {
                    vehicles.push({ year, make, model });
                });
            });
        });

        return vehicles;
    }

    // Main scraping function
    async scrapeVehicles(limit = 100) {
        console.log('🚀 Starting TireRack scraper with 0.1 second delays');
        console.log(`📊 Target: ${limit} vehicles`);
        
        const vehicles = this.getPopularVehicles().slice(0, limit);
        
        console.log(`🎯 Scraping ${vehicles.length} popular vehicles...`);
        
        for (const vehicle of vehicles) {
            await this.getVehicleTireSizes(vehicle);
        }
        
        console.log('\n✅ Scraping completed!');
        console.log(`📈 Total requests: ${this.requestCount}`);
        console.log(`⏱️  Total time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
        console.log(`🔥 Average rate: ${(this.requestCount / ((Date.now() - this.startTime) / 1000)).toFixed(1)} req/sec`);
        console.log(`💾 Collected data for ${Object.keys(this.tireData).length} vehicles`);
        
        // Save data to file
        this.saveTireData();
    }

    // Save tire data to JSON file
    saveTireData() {
        const filename = 'tire-data.json';
        const jsonData = JSON.stringify(this.tireData, null, 2);
        
        fs.writeFileSync(filename, jsonData);
        console.log(`💾 Tire data saved to ${filename}`);
        
        // Also create a JavaScript file for the website
        const jsFilename = 'tire-data.js';
        const jsContent = `// Auto-generated tire data from TireRack scraper
// Generated: ${new Date().toISOString()}
// Total vehicles: ${Object.keys(this.tireData).length}

const scrapedTireData = ${JSON.stringify(this.tireData, null, 2)};

// Export for use in tire-finder.html
if (typeof module !== 'undefined' && module.exports) {
    module.exports = scrapedTireData;
}`;
        
        fs.writeFileSync(jsFilename, jsContent);
        console.log(`🔧 JavaScript data saved to ${jsFilename}`);
    }
}

// Run the scraper if this file is executed directly
if (require.main === module) {
    const scraper = new TireRackScraper();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const limit = args[0] ? parseInt(args[0]) : 50;
    
    console.log('🎯 TireRack Scraper - 0.1 Second Delays');
    console.log('⚠️  Use responsibly and respect tirerack.com');
    console.log(`📊 Scraping ${limit} popular vehicles...\n`);
    
    scraper.scrapeVehicles(limit)
        .then(() => {
            console.log('\n🎉 Scraping job completed successfully!');
        })
        .catch((error) => {
            console.error('\n❌ Scraping job failed:', error);
        });
}

module.exports = TireRackScraper;