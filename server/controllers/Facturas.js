import pool from '../config/db.js';

class Facturas {
    static async getFactura(req, res) {
        const { idReserva } = req.params;

        try {
            const query = `SELECT archivoPDF FROM Facturas WHERE idReserva = ?`;
            const [rows] = await pool.query(query, [idReserva]);

            if (rows.length === 0) {
                return res.status(404).json({ error: "Factura no encontrada." });
            }

            const pdfBuffer = rows[0].archivoPDF;

            // Enviar el PDF como respuesta
            res.setHeader("Content-Type", "application/pdf");
            res.send(pdfBuffer);
        } catch (error) {
            console.error("Error al obtener la factura:", error);
            res.status(500).json({ error: "Error al obtener la factura." });
        }
    }
}

export default Facturas;

