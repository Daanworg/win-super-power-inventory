// purchaseOrderService.js - Generates Purchase Order PDFs

/**
 * Generates a single consolidated and customized Purchase Order PDF.
 * @param {Array<Object>} itemsToOrder - An array of objects, each with { material, quantity }.
 * @param {string} supplierName - The name of the supplier for the PO.
 */
export function generatePurchaseOrder(itemsToOrder, supplierName) {
    if (!itemsToOrder || itemsToOrder.length === 0) {
        console.error("No items provided for PO generation.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const poNumber = `PO-${Date.now()}`;
    const today = new Date().toLocaleDateString();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PURCHASE ORDER", 105, 22, { align: 'center' });

    // Company Info
    doc.setFontSize(12);
    doc.text("FROM:", 20, 40);
    doc.setFont("helvetica", "normal");
    doc.text("Win Super Power Antenna", 20, 46);
    doc.text("Sri Lanka", 20, 52);

    // PO Details
    doc.setFont("helvetica", "bold");
    doc.text("PO Number:", 130, 40);
    doc.setFont("helvetica", "normal");
    doc.text(poNumber, 160, 40);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 130, 46);
    doc.setFont("helvetica", "normal");
    doc.text(today, 160, 46);

    // Supplier Info
    doc.setFont("helvetica", "bold");
    doc.text("TO:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(supplierName || "________________________ (Supplier Name)", 20, 76);
    doc.text("________________________ (Supplier Address)", 20, 82);


    // Items Table
    const tableColumn = ["#", "Item Description", "Order Quantity", "Unit"];
    const tableRows = [];

    itemsToOrder.forEach((item, index) => {
        const { material, quantity } = item;
        const materialRow = [
            index + 1,
            material.name,
            quantity,
            material.unit
        ];
        tableRows.push(materialRow);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 95,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] }
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Please deliver items to the address above. Contact us with any questions regarding this order.", 105, Math.max(finalY + 20, 270), { align: 'center'});

    // Professional signature line
    doc.setFont("helvetica", "normal");
    doc.text("Authorized By: ________________________", 20, Math.max(finalY + 40, 285));

    // Save the PDF
    const safeSupplierName = supplierName.replace(/[\s/]/g, '_') || 'General';
    doc.save(`PO_${safeSupplierName}_${poNumber}.pdf`);
}
