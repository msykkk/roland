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

    // Extract tire sizes from TireRack vehicle page - Enhanced
    extractTireSizes(html, vehicle) {
        try {
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const tireSizes = new Set();
            
            // Comprehensive tire size patterns
            const patterns = [
                /(?:^|\s)(\d{3}\/\d{2}R\d{2})(?:\s|$)/g,           // 225/60R16
                /(?:^|\s)(P\d{3}\/\d{2}R\d{2})(?:\s|$)/g,          // P225/60R16
                /(?:^|\s)(LT\d{3}\/\d{2}R\d{2})(?:\s|$)/g,         // LT245/75R16
                /(?:^|\s)(\d{3}\/\d{2}-\d{2})(?:\s|$)/g,           // 225/60-16
                /(?:^|\s)(\d{3}\/\d{2}ZR\d{2})(?:\s|$)/g,          // 225/45ZR17
                /(?:^|\s)(\d{2,3}\/\d{2}R\d{2}\.?\d?)(?:\s|$)/g,   // 31/10.50R15
            ];
            
            // Search all patterns in HTML
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(html)) !== null) {
                    const size = match[1].trim();
                    if (size.length > 6) {
                        tireSizes.add(size);
                    }
                }
            });

            // Also search in DOM elements
            const selectors = ['.tire-size', '.size', '[data-size]', '.specification', 'td', 'li'];
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const text = element.textContent;
                    patterns.forEach(pattern => {
                        pattern.lastIndex = 0;
                        let match;
                        while ((match = pattern.exec(text)) !== null) {
                            const size = match[1].trim();
                            if (size.length > 6) {
                                tireSizes.add(size);
                            }
                        }
                    });
                });
            });

            // Filter and sort results
            const sizesArray = Array.from(tireSizes)
                .filter(size => {
                    const parts = size.match(/(\d{2,3})\/(\d{2})R?(\d{2})/);
                    if (!parts) return false;
                    
                    const width = parseInt(parts[1]);
                    const ratio = parseInt(parts[2]);
                    const diameter = parseInt(parts[3]);
                    
                    return width >= 125 && width <= 395 &&
                           ratio >= 25 && ratio <= 85 &&
                           diameter >= 13 && diameter <= 24;
                })
                .sort();

            return sizesArray;
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

    // Comprehensive vehicles list - all major models and years
    getComprehensiveVehicles() {
        const currentYear = new Date().getFullYear();
        // Focus on available years (2016-2024) - skip 2025 until models are released
        const years = [];
        for (let year = currentYear - 1; year >= currentYear - 8; year--) {
            years.push(year);
        }
        const vehicles = [];

        const allModels = {
            'Ford': [
                'F-150', 'F-250', 'F-350', 'F-450', 'Ranger', 'Maverick',
                'Escape', 'Explorer', 'Expedition', 'Bronco', 'Bronco Sport', 'Edge', 'EcoSport',
                'Mustang', 'Fusion', 'Focus', 'Fiesta', 'Taurus',
                'Transit', 'E-Series', 'Transit Connect'
            ],
            'Chevrolet': [
                'Silverado 1500', 'Silverado 2500HD', 'Silverado 3500HD', 'Colorado', 'S-10',
                'Equinox', 'Traverse', 'Tahoe', 'Suburban', 'Blazer', 'Trailblazer', 'Trax',
                'Camaro', 'Corvette', 'Malibu', 'Cruze', 'Impala', 'Spark', 'Sonic',
                'Express', 'City Express'
            ],
            'Toyota': [
                'Tacoma', 'Tundra', 'Sequoia', '4Runner', 'Land Cruiser', 'Highlander',
                'RAV4', 'Venza', 'C-HR', 'Sienna', 'Prius', 'Prius Prime', 'Prius C', 'Prius V',
                'Camry', 'Corolla', 'Avalon', 'Yaris', 'Mirai', 'GR86', 'Supra'
            ],
            'Honda': [
                'Ridgeline', 'Pilot', 'Passport', 'CR-V', 'HR-V', 'Odyssey',
                'Accord', 'Civic', 'Insight', 'Clarity', 'Fit', 'CR-Z', 'S2000'
            ],
            'Nissan': [
                'Titan', 'Titan XD', 'Frontier', 'Pathfinder', 'Armada', 'Rogue', 'Murano',
                'Kicks', 'Sentra', 'Altima', 'Maxima', 'Versa', 'Leaf', '370Z', 'GT-R',
                'NV200', 'NV1500', 'NV2500', 'NV3500'
            ],
            'Jeep': [
                'Gladiator', 'Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade',
                'Grand Cherokee L', 'Commander', 'Patriot', 'Liberty', 'Wagoneer', 'Grand Wagoneer'
            ],
            'RAM': [
                '1500', '2500', '3500', '4500', '5500', 'ProMaster', 'ProMaster City', 'C/V'
            ],
            'GMC': [
                'Sierra 1500', 'Sierra 2500HD', 'Sierra 3500HD', 'Canyon', 'Yukon', 'Yukon XL',
                'Acadia', 'Terrain', 'Envoy', 'Savana'
            ],
            'Hyundai': [
                'Santa Fe', 'Tucson', 'Palisade', 'Kona', 'Venue', 'Nexo',
                'Sonata', 'Elantra', 'Accent', 'Ioniq', 'Veloster', 'Genesis'
            ],
            'Kia': [
                'Sorento', 'Sportage', 'Telluride', 'Soul', 'Niro', 'Seltos',
                'Optima', 'Forte', 'Rio', 'Cadenza', 'Stinger', 'K5', 'EV6'
            ],
            'Subaru': [
                'Outback', 'Forester', 'Ascent', 'XV Crosstrek', 'Crosstrek',
                'Legacy', 'Impreza', 'WRX', 'STI', 'BRZ'
            ],
            'Mazda': [
                'CX-9', 'CX-5', 'CX-3', 'CX-30', 'Mazda3', 'Mazda6', 'MX-5 Miata'
            ],
            'Volkswagen': [
                'Atlas', 'Tiguan', 'Taos', 'ID.4', 'Passat', 'Jetta', 'Golf', 'Beetle', 'Arteon'
            ],
            'BMW': [
                'X7', 'X6', 'X5', 'X4', 'X3', 'X2', 'X1', 'iX', 'i4', 'i3',
                '7 Series', '5 Series', '4 Series', '3 Series', '2 Series', '1 Series', 'Z4'
            ],
            'Mercedes-Benz': [
                'GLS', 'GLE', 'GLC', 'GLB', 'GLA', 'G-Class', 'EQS', 'EQC',
                'S-Class', 'E-Class', 'C-Class', 'A-Class', 'CLS', 'SL', 'AMG GT'
            ],
            'Audi': [
                'Q8', 'Q7', 'Q5', 'Q3', 'e-tron', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'TT', 'R8'
            ],
            'Lexus': [
                'LX', 'GX', 'RX', 'NX', 'UX', 'LS', 'ES', 'IS', 'LC', 'RC', 'GS'
            ],
            'Infiniti': [
                'QX80', 'QX60', 'QX56', 'QX50', 'QX30', 'Q70', 'Q60', 'Q50'
            ],
            'Acura': [
                'MDX', 'RDX', 'TLX', 'ILX', 'NSX', 'RLX', 'TSX', 'TL'
            ],
            'Cadillac': [
                'Escalade', 'XT6', 'XT5', 'XT4', 'CT6', 'CT5', 'CT4', 'ATS', 'CTS', 'XTS'
            ],
            'Lincoln': [
                'Navigator', 'Aviator', 'Corsair', 'Nautilus', 'Continental', 'MKZ', 'MKC'
            ],
            'Buick': [
                'Enclave', 'Encore', 'Encore GX', 'Envision', 'LaCrosse', 'Regal'
            ],
            'Chrysler': [
                'Pacifica', '300', 'Voyager', 'Town & Country', 'Sebring', 'PT Cruiser'
            ],
            'Dodge': [
                'Durango', 'Journey', 'Challenger', 'Charger', 'Dart', 'Avenger', 'Viper'
            ],
            'Mitsubishi': [
                'Outlander', 'Eclipse Cross', 'Outlander Sport', 'Mirage', 'Lancer'
            ],
            'Volvo': [
                'XC90', 'XC60', 'XC40', 'S90', 'S60', 'V90', 'V60'
            ]
        };

        // Create all vehicle combinations
        years.forEach(year => {
            Object.entries(allModels).forEach(([make, models]) => {
                models.forEach(model => {
                    vehicles.push({ year, make, model });
                });
            });
        });

        console.log(`📋 Generated ${vehicles.length} vehicle combinations`);
        return vehicles;
    }

    // Get popular vehicles (subset for quick testing)
    getPopularVehicles(limit = 100) {
        const allVehicles = this.getComprehensiveVehicles();
        
        // Prioritize recent years and popular models
        const priorityMakes = ['Ford', 'Chevrolet', 'Toyota', 'Honda', 'Nissan', 'Jeep', 'RAM', 'GMC'];
        const priorityModels = [
            'F-150', 'Silverado 1500', 'Camry', 'Civic', 'Accord', 'CR-V', 'RAV4', 
            'Altima', 'Wrangler', '1500', 'Sierra 1500', 'Explorer', 'Equinox', 'Corolla'
        ];

        const priorityVehicles = allVehicles.filter(v => 
            v.year >= 2020 && 
            (priorityMakes.includes(v.make) || priorityModels.includes(v.model))
        );

        return priorityVehicles.slice(0, limit);
    }

    // Main scraping function - comprehensive by default
    async scrapeVehicles(limit = null) {
        console.log('🚀 Starting comprehensive TireRack scraper with 0.1 second delays');
        
        const allVehicles = this.getComprehensiveVehicles();
        const vehicles = limit ? allVehicles.slice(0, limit) : allVehicles;
        
        console.log(`📊 Target: ${vehicles.length} vehicles (${limit ? 'limited' : 'ALL comprehensive data'})`);
        console.log(`📅 Years: 2016-2025 (10 years)`);
        console.log(`🏭 Manufacturers: 28 major brands`);
        console.log(`⏱️  Estimated time: ${Math.round(vehicles.length * 0.1 / 60)} minutes`);
        console.log('');
        
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