// config.js - FACTORY CONFIGURATION FILE - vFinal (Zero Initial Stock, No Max, with updated_at placeholders for state.js)

export const MATERIALS_CONFIG = [
  // Frame Materials - Added 'updated_at' for consistency with potential DB schema, though client doesn't set it.
  // The actual 'updated_at' will come from Supabase.
  { name: "5/32 x 3/4 Tube", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  { name: "1/8 x 1/2 Tube", unit: "pcs", currentStock: 0, reorderPoint: 500, updatedAt: null },
  { name: "1/8 x 3/4 Tube", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  { name: "End Knob Round", unit: "pcs", currentStock: 0, reorderPoint: 300, updatedAt: null },
  { name: "End Knob Square 1/2x1/2", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  { name: "Dipole (CI Cup)", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "U-Clip", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "12cm Round Tube 7/8 MF", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  { name: "15cm Round Tube 5/8 MF", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "5/8 x 4 CSK Screw", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  { name: "3/8 x 4 Screw", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },

  // Wire/Connector Materials
  { name: "16 1/2 Ygr Wire", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "F-Connector Male (4005)", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  { name: "F-Connector Female (2002)", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },

  // Booster Materials
  { name: "Macking Coil", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Coil 28gsm (25cm)", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Coil 26gsm (16cm)", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Coil 25gsm (36cm)", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Resistor 1k", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "Resistor 100-ohm", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "Resistor 68k", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "Resistor 2k", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "Resistor 150-R", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "Resistor 10k", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "LED Multicolour", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "LED 5mm", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "PF 12", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "PF 39", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "PF 102 Indian", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "PF 102 Normal", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "Capacitor 25v 100uF", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Capacitor 25v 220uF", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Transistor (2355)", unit: "pcs", currentStock: 0, reorderPoint: 100, updatedAt: null },
  
  // Power Supply Materials
  { name: "Plastic Box (Power)", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Transformer", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "IN4007 Diode", unit: "pcs", currentStock: 0, reorderPoint: 200, updatedAt: null },
  { name: "5C 2V Wire 3-yard", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "4-Antenna Jack", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "AC Cord", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },

  // Packing Materials
  { name: "Packing Bag", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Warranty Card", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Round Sticker", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Box Plastic Cover", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null },
  { name: "Box Sticker", unit: "pcs", currentStock: 0, reorderPoint: 50, updatedAt: null }
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
