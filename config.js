// config.js - FACTORY CONFIGURATION FILE - v4.0 (Zero Initial Stock, No Max)

export const MATERIALS_CONFIG = [
  // Frame Materials
  { name: "5/32 x 3/4 Tube", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  { name: "1/8 x 1/2 Tube", unit: "pcs", currentStock: 0, reorderPoint: 500 },
  { name: "1/8 x 3/4 Tube", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  { name: "End Knob Round", unit: "pcs", currentStock: 0, reorderPoint: 300 },
  { name: "End Knob Square 1/2x1/2", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  { name: "Dipole (CI Cup)", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "U-Clip", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "12cm Round Tube 7/8 MF", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  { name: "15cm Round Tube 5/8 MF", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "5/8 x 4 CSK Screw", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  { name: "3/8 x 4 Screw", unit: "pcs", currentStock: 0, reorderPoint: 100 },

  // Wire/Connector Materials
  { name: "16 1/2 Ygr Wire", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "F-Connector Male (4005)", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  { name: "F-Connector Female (2002)", unit: "pcs", currentStock: 0, reorderPoint: 100 },

  // Booster Materials
  { name: "Macking Coil", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Coil 28gsm (25cm)", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Coil 26gsm (16cm)", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Coil 25gsm (36cm)", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Resistor 1k", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "Resistor 100-ohm", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "Resistor 68k", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "Resistor 2k", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "Resistor 150-R", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "Resistor 10k", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "LED Multicolour", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "LED 5mm", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "PF 12", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "PF 39", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "PF 102 Indian", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "PF 102 Normal", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "Capacitor 25v 100uF", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Capacitor 25v 220uF", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Transistor (2355)", unit: "pcs", currentStock: 0, reorderPoint: 100 },
  
  // Power Supply Materials
  { name: "Plastic Box (Power)", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Transformer", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "IN4007 Diode", unit: "pcs", currentStock: 0, reorderPoint: 200 },
  { name: "5C 2V Wire 3-yard", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "4-Antenna Jack", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "AC Cord", unit: "pcs", currentStock: 0, reorderPoint: 50 },

  // Packing Materials
  { name: "Packing Bag", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Warranty Card", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Round Sticker", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Box Plastic Cover", unit: "pcs", currentStock: 0, reorderPoint: 50 },
  { name: "Box Sticker", unit: "pcs", currentStock: 0, reorderPoint: 50 }
];

const subAssemblyRecipes = {
  "Antenna Frame Assembly": { "5/32 x 3/4 Tube": 1, "1/8 x 1/2 Tube": 8, "1/8 x 3/4 Tube": 2, "End Knob Round": 6, "End Knob Square 1/2x1/2": 2, "Dipole (CI Cup)": 1, "U-Clip": 1, "12cm Round Tube 7/8 MF": 2, "15cm Round Tube 5/8 MF": 1, "5/8 x 4 CSK Screw": 2 },
  "Booster Assembly": { "Macking Coil": 1, "Coil 28gsm (25cm)": 1, "Coil 26gsm (16cm)": 2, "Resistor 1k": 1, "LED Multicolour": 1, "PF 12": 1, "PF 39": 2, "PF 102 Indian": 1, "PF 102 Normal": 2, "Resistor 100-ohm": 1, "Resistor 68k": 2, "Resistor 2k": 1, "Resistor 150-R": 1, "Capacitor 25v 100uF": 1, "F-Connector Female (2002)": 1, "Transistor (2355)": 2 },
  "Power Supply Assembly": { "Plastic Box (Power)": 1, "Transformer": 1, "IN4007 Diode": 2, "Coil 25gsm (36cm)": 1, "5C 2V Wire 3-yard": 1, "4-Antenna Jack": 1, "F-Connector Female (2002)": 1, "Resistor 10k": 1, "PF 102 Normal": 1, "Capacitor 25v 220uF": 1, "3/8 x 4 Screw": 2, "LED 5mm": 1, "AC Cord": 1 },
  "Wire Assembly": { "16 1/2 Ygr Wire": 1, "F-Connector Male (4005)": 2 },
  "Packaging Set": { "Packing Bag": 1, "Warranty Card": 1, "Round Sticker": 1, "Box Plastic Cover": 1, "Box Sticker": 1 },
};

function generateCompleteUnitRecipe(recipes) {
    const completeRecipe = {};
    const componentAssemblies = [
        recipes["Antenna Frame Assembly"],
        recipes["Booster Assembly"],
        recipes["Power Supply Assembly"],
        recipes["Wire Assembly"],
        recipes["Packaging Set"]
    ];

    for (const assembly of componentAssemblies) {
        for (const material in assembly) {
            if (completeRecipe[material]) {
                completeRecipe[material] += assembly[material];
            } else {
                completeRecipe[material] = assembly[material];
            }
        }
    }
    return completeRecipe;
}

export const RECIPES_CONFIG = {
    ...subAssemblyRecipes,
    "COMPLETE ANTENNA UNIT": generateCompleteUnitRecipe(subAssemblyRecipes)
};