import pool from '../config/db.js';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

class Informes {

    static async generateAndSendPDF(htmlContent, fileName, res) {
        try {
            const pdfPath = path.join(process.cwd(), "assets/reportes", fileName);
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setContent(htmlContent);

            await page.pdf({
                path: pdfPath,
                format: "A4",
                landscape: fileName === "lista_policia.pdf",
                printBackground: true,
                margin: {
                    top: "20mm",
                    right: "15mm",
                    bottom: "20mm",
                    left: "15mm"
                }
            });

            await browser.close();
            res.download(pdfPath, fileName, () => fs.unlinkSync(pdfPath));
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            res.status(500).json({ error: "Error al generar el PDF." });
        }
    }


    // 📌 Generar HTML para Lista de Policía
    static generateHTMLListaPolicia(data) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Ficha de Policía</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <h1>Ficha de Policía</h1>
            <table>
                <thead>
                    <tr>
                        <th>Documento</th>
                        <th>Nombre</th>
                        <th>Apellidos</th>
                        <th>Nacionalidad</th>
                        <th>Nacimiento</th>
                        <th>Sexo</th>
                        <th>Caducidad</th>
                        <th>Emisión</th>
                        <th>Dirección</th>
                        <th>Hijo de</th>
                        <th>Lugar Nacimiento</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${row.numeroDocumento}</td>
                            <td>${row.nombre}</td>
                            <td>${row.apellidos}</td>
                            <td>${row.nacionalidad}</td>
                            <td>${formatDate(row.fechaNacimiento)}</td>
                            <td>${row.sexo}</td>
                            <td>${formatDate(row.fechaCaducidad)}</td>
                            <td>${formatDate(row.fechaEmision)}</td>
                            <td>${row.direccion}</td>
                            <td>${row.hijoDe}</td>
                            <td>${row.lugarNacimiento}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>`;
    }

    // 📌 Lista de Policía: Huéspedes que han hecho check-in hoy
    static async getListaPolicia(req, res) {
        try {
            const query = `
                SELECT 
                    h.numeroDocumento, 
                    p.nombre, 
                    p.apellidos, 
                    h.nacionalidad, 
                    h.fechaNacimiento, 
                    h.sexo,
                    h.fechaCaducidad,
                    h.fechaEmision,
                    h.direccion,
                    h.hijoDe,
                    h.lugarNacimiento
                FROM Huesped h
                JOIN HuespedHabitacion hh ON h.numeroDocumento = hh.numeroDocumento
                JOIN Reserva r ON hh.idReserva = r.idReserva
                JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
                JOIN Persona p ON h.numeroDocumento = p.numeroDocumento
                WHERE r.fechaEntrada = CURDATE();
            `;

            const [rows] = await pool.query(query);
            if (!rows.length) return res.status(404).json({ error: "No hay registros hoy." });

            const html = Informes.generateHTMLListaPolicia(rows);
            await Informes.generateAndSendPDF(html, "lista_policia.pdf", res);
        } catch (error) {
            console.error("Error al obtener la lista de policía:", error);
            res.status(500).json({ error: "Error al obtener la lista de policía." });
        }
    }


    // 📌 Generar HTML para Lista de Ocupación (Agrupando huéspedes en una celda y mostrando cantidad)
    static generateHTMLListaOcupacion(data) {
        // 📌 Calcular totales
        const totalHabitaciones = data.length;
        const totalHuespedes = data.reduce((acc, row) => acc + row.totalHuespedes, 0);

        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Lista de Ocupación</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
                .totals { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Lista de Ocupación</h1>
            <table>
                <thead>
                    <tr>
                        <th>Habitación</th>
                        <th>Tipo</th>
                        <th>Fecha Entrada</th>
                        <th>Fecha Salida</th>
                        <th>Número de Huéspedes</th>
                        <th>Huéspedes</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${row.numHabitacion}</td>
                            <td>${row.tipo}</td>
                            <td>${formatDate(row.fechaEntrada)}</td>
                            <td>${formatDate(row.fechaSalida)}</td>
                            <td style="text-align: center;">${row.totalHuespedes}</td>
                            <td>${row.huespedes}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <p><strong>Total de Habitaciones Ocupadas:</strong> ${totalHabitaciones}</p>
                <p><strong>Total de Huéspedes:</strong> ${totalHuespedes}</p>
            </div>
        </body>
        </html>`;
    }

    // 📌 Lista de Ocupación: Habitaciones ocupadas con huéspedes agrupados en una sola fila
    static async getListaOcupacion(req, res) {
        try {
            const query = `
                SELECT 
                    h.numHabitacion, 
                    h.tipo, 
                    r.fechaEntrada,
                    r.fechaSalida,
                    GROUP_CONCAT(CONCAT(p.nombre, ' ', p.apellidos) SEPARATOR ', ') AS huespedes,
                    COUNT(p.numeroDocumento) AS totalHuespedes
                FROM Habitacion h
                JOIN HabitacionReservada hr ON h.numHabitacion = hr.numHabitacion
                JOIN Reserva r ON hr.idReserva = r.idReserva
                JOIN HuespedHabitacion hh ON r.idReserva = hh.idReserva
                JOIN Huesped hu ON hh.numeroDocumento = hu.numeroDocumento
                JOIN Persona p ON hu.numeroDocumento = p.numeroDocumento
                WHERE h.estado = "Ocupada"
                GROUP BY h.numHabitacion, h.tipo, r.fechaEntrada, r.fechaSalida;
            `;

            const [rows] = await pool.query(query);
            if (!rows.length) return res.status(404).json({ error: "No hay habitaciones ocupadas." });

            const html = Informes.generateHTMLListaOcupacion(rows);
            await Informes.generateAndSendPDF(html, "lista_ocupacion.pdf", res);
        } catch (error) {
            console.error("Error al obtener la lista de ocupación:", error);
            res.status(500).json({ error: "Error al obtener la lista de ocupación." });
        }
    }

    // 📌 Generar HTML para Check-ins de Hoy
    static generateHTMLCheckIns(data) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Check-ins de Hoy</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <h1>Check-ins de Hoy</h1>
            <table>
                <thead>
                    <tr>
                        <th>Localizador</th>
                        <th>Fecha Entrada</th>
                        <th>Fecha Salida</th>
                        <th>Nombre Cliente</th>
                        <th>Apellidos Cliente</th>
                        <th>Habitación</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${row.idReserva}</td>
                            <td>${formatDate(row.fechaEntrada)}</td>
                            <td>${formatDate(row.fechaSalida)}</td>
                            <td>${row.clienteNombre}</td>
                            <td>${row.clienteApellidos}</td>
                            <td>${row.numHabitacion}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>`;
    }

    // 📌 Check-ins de hoy
    static async getCheckIns(req, res) {
        try {
            const query = `
                SELECT 
                    r.idReserva, 
                    r.fechaEntrada, 
                    r.fechaSalida, 
                    c.nombre AS clienteNombre, 
                    c.apellidos AS clienteApellidos, 
                    hr.numHabitacion
                FROM Reserva r
                JOIN Cliente c ON r.idCliente = c.idCliente
                JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
                JOIN Habitacion h ON h.numHabitacion = hr.numHabitacion
                WHERE r.fechaEntrada = CURDATE() AND h.estado = "Disponible" AND r.estado = "Activa";
            `;

            const [rows] = await pool.query(query);
            if (!rows.length) return res.status(404).json({ error: "No hay check-ins hoy." });

            const html = Informes.generateHTMLCheckIns(rows);
            await Informes.generateAndSendPDF(html, "checkins_hoy.pdf", res);
        } catch (error) {
            console.error("Error al obtener los check-ins de hoy:", error);
            res.status(500).json({ error: "Error al obtener los check-ins de hoy." });
        }
    }

    // 📌 Generar HTML para Check-outs de Hoy
    static generateHTMLCheckOuts(data) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Check-outs de Hoy</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <h1>Check-outs de Hoy</h1>
            <table>
                <thead>
                    <tr>
                        <th>Localizador</th>
                        <th>Fecha Entrada</th>
                        <th>Fecha Salida</th>
                        <th>Nombre Cliente</th>
                        <th>Apellidos Cliente</th>
                        <th>Habitaciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${row.idReserva}</td>
                            <td>${formatDate(row.fechaEntrada)}</td>
                            <td>${formatDate(row.fechaSalida)}</td>
                            <td>${row.clienteNombre}</td>
                            <td>${row.clienteApellidos}</td>
                            <td>${row.habitaciones}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>`;
    }

    // 📌 Check-outs de hoy
    static async getCheckOuts(req, res) {
        try {
            const query = `
                SELECT
                    r.idReserva, 
                    r.fechaEntrada, 
                    r.fechaSalida, 
                    c.nombre AS clienteNombre, 
                    c.apellidos AS clienteApellidos,
                    GROUP_CONCAT(hr.numHabitacion SEPARATOR ', ') AS habitaciones
                FROM Reserva r
                JOIN Cliente c ON r.idCliente = c.idCliente
                JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
                WHERE r.fechaSalida = CURDATE() AND r.estado = 'En_curso'
                GROUP BY r.idReserva, r.fechaEntrada, r.fechaSalida, c.nombre, c.apellidos;
            `;

            const [rows] = await pool.query(query);
            if (!rows.length) return res.status(404).json({ error: "No hay check-outs hoy." });

            const html = Informes.generateHTMLCheckOuts(rows);
            await Informes.generateAndSendPDF(html, "checkouts_hoy.pdf", res);
        } catch (error) {
            console.error("Error al obtener los check-outs de hoy:", error);
            res.status(500).json({ error: "Error al obtener los check-outs de hoy." });
        }
    }

    static generateHTMLInformeReservas(
        data,
        totalFacturado,
        mediaFacturacion,
        reservaMasCara,
        reservaMasBarata,
        totalReservas,
        mediaNoches,
        reservaMaxNoches,
        reservaMinNoches,
        ingresosServicios,
        reservasConServicio,
        servicioMasComun,
        porcentajeServicios
    ) {
        if (!Array.isArray(data)) {
            console.error("Error: `data` no es un array.");
            return "<p>Error interno al generar el informe.</p>";
        }

        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Informe de Ocupación</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 15px; 
                    color: #333; 
                }
                h1, h2, h3 { 
                    color: #444; 
                    margin-bottom: 10px;
                }
                h1 { font-size: 22px; text-align: center;}
                h2 { font-size: 18px; }
                h3 { font-size: 16px; }
                
                .section {
                    padding: 10px;
                }
    
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                    background: #fff;
                    border-radius: 6px;
                    overflow: hidden;
                    font-size: 14px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 6px; 
                    text-align: center;
                }
                th { 
                    background-color: #e3e3e3;
                    font-weight: bold;
                }
                p { 
                    font-size: 14px; 
                    margin: 4px 0;
                }
                .highlight { 
                    font-weight: bold; 
                    color: #d9534f; 
                }
            </style>
        </head>
        <body>
    
            <h1>Informe de Ocupación (Último Mes)</h1>
    
            <div class="section">
                <h2>Reservas Finalizadas</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Localizador</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Noches</th>
                            <th>Total (€)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${row.idReserva}</td>
                                <td>${formatDate(row.fechaEntrada)}</td>
                                <td>${formatDate(row.fechaSalida)}</td>
                                <td>${row.numNoches}</td>
                                <td class="highlight">€${isNaN(parseFloat(row.precio)) ? '0.00' : parseFloat(row.precio).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
    
            <div class="section">
                <h2>Estadísticas de Facturación</h2>
                <p><strong>Total de Reservas:</strong> ${totalReservas}</p>
                <p><strong>Total Facturado:</strong> <span class="highlight">€${totalFacturado.toFixed(2)}</span></p>
                <p><strong>Media por Reserva:</strong> €${mediaFacturacion.toFixed(2)}</p>
                <p><strong>Reserva Más Cara:</strong> €${reservaMasCara.toFixed(2)}</p>
                <p><strong>Reserva Más Barata:</strong> €${reservaMasBarata.toFixed(2)}</p>
            </div>
    
            <div class="section">
                <h2>Duración de las Reservas</h2>
                <p><strong>Media Noches:</strong> ${mediaNoches.toFixed(2)} noches</p>
                <p><strong>Mayor Duración:</strong> ${reservaMaxNoches} noches</p>
                <p><strong>Menor Duración:</strong> ${reservaMinNoches} noches</p>
            </div>
    
            <div class="section">
                <h2>Servicios Contratados</h2>
                <p><strong>Total Ingresos por Servicios:</strong> <span class="highlight">€${ingresosServicios.toFixed(2)}</span></p>
                <p><strong>Reservas con Servicio:</strong> ${reservasConServicio} de ${data.length} (${((reservasConServicio / data.length) * 100).toFixed(2)}%)</p>
                <p><strong>Servicio Más Contratado:</strong> ${servicioMasComun}</p>
    
                <table>
                    <thead>
                        <tr>
                            <th>Servicio</th>
                            <th>Total</th>
                            <th>Porcentaje (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${porcentajeServicios.map(row => `
                            <tr>
                                <td>${row.nombreServicio}</td>
                                <td>${row.totalContratado}</td>
                                <td>${row.porcentaje}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </body>
        </html>`;
    }


    static async getInformeReservas(req, res) {
        try {
            // 📌 Consulta de reservas finalizadas en el último mes
            const query = `
                SELECT 
                    r.idReserva,
                    r.fechaEntrada,
                    r.fechaSalida,
                    DATEDIFF(r.fechaSalida, r.fechaEntrada) AS numNoches,
                    COALESCE(r.precio, 0) AS precio
                FROM Reserva r
                WHERE r.estado = 'Finalizada' 
                AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
            `;

            const [reservas] = await pool.query(query);

            // 📌 Verificar si `reservas` es un array
            if (!Array.isArray(reservas)) {
                console.error("Error: `reservas` no es un array.");
                return res.status(500).json({ error: "Error interno al obtener reservas." });
            }

            const facturacionQuery = `
                SELECT 
                    COALESCE(AVG(r.precio), 0) AS mediaFacturacion,
                    COALESCE(MAX(r.precio), 0) AS reservaMasCara,
                    COALESCE(MIN(r.precio), 0) AS reservaMasBarata,
                    COALESCE(AVG(DATEDIFF(r.fechaSalida, r.fechaEntrada)), 0) AS mediaNoches,
                    COALESCE(MAX(DATEDIFF(r.fechaSalida, r.fechaEntrada)), 0) AS reservaMaxNoches,
                    COALESCE(MIN(DATEDIFF(r.fechaSalida, r.fechaEntrada)), 0) AS reservaMinNoches
                FROM Reserva r
                WHERE r.estado = 'Finalizada' 
                AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
            `;

            // 📌 Servicios Contratados: Total ingresos por servicios
            const ingresosServiciosQuery = `
                SELECT COALESCE(SUM(s.precio), 0) AS ingresosServicios
                FROM Anade a
                JOIN Servicio s ON a.idServicio = s.idServicio
                JOIN Reserva r ON a.idReserva = r.idReserva
                WHERE r.estado = 'Finalizada'
                AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
            `;

            const serviciosQuery = `
                SELECT COUNT(DISTINCT r.idReserva) AS reservasConServicio
                FROM Reserva r
                JOIN Anade a ON r.idReserva = a.idReserva
                WHERE r.estado = 'Finalizada'
                AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
            `;

            const servicioMasComunQuery = `
                SELECT s.nombreServicio, COUNT(*) AS cantidad
                FROM Anade a
                JOIN Servicio s ON a.idServicio = s.idServicio
                JOIN Reserva r ON a.idReserva = r.idReserva
                WHERE r.estado = 'Finalizada'
                AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                GROUP BY s.nombreServicio
                ORDER BY cantidad DESC
                LIMIT 1;
            `;

            const porcentajeServiciosQuery = `
                SELECT 
                    s.nombreServicio,
                    COUNT(a.idServicio) AS totalContratado,
                    ROUND((COUNT(a.idServicio) * 100) / (SELECT COUNT(*) FROM Anade a 
                        JOIN Reserva r ON a.idReserva = r.idReserva 
                        WHERE r.estado = 'Finalizada' 
                        AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)), 2) AS porcentaje
                FROM Anade a
                JOIN Servicio s ON a.idServicio = s.idServicio
                JOIN Reserva r ON a.idReserva = r.idReserva
                WHERE r.estado = 'Finalizada' 
                AND r.fechaSalida >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                GROUP BY s.nombreServicio
                ORDER BY totalContratado DESC;
            `;

            const [[resultFacturacion]] = await pool.query(facturacionQuery);
            const [[resultIngresosServicios]] = await pool.query(ingresosServiciosQuery);
            const [[{ reservasConServicio }]] = await pool.query(serviciosQuery);
            const [[{ nombreServicio: servicioMasComun } = { nombreServicio: "Ninguno" }]] = await pool.query(servicioMasComunQuery);
            const [porcentajeServicios] = await pool.query(porcentajeServiciosQuery);

            // 📌 Evitar errores con valores `NULL`
            const totalReservas = reservas.length;
            const totalFacturado = reservas.reduce((acc, r) => acc + parseFloat(r.precio), 0);
            const mediaFacturacion = parseFloat(resultFacturacion.mediaFacturacion) || 0;
            const reservaMasCara = parseFloat(resultFacturacion.reservaMasCara) || 0;
            const reservaMasBarata = parseFloat(resultFacturacion.reservaMasBarata) || 0;
            const mediaNoches = parseFloat(resultFacturacion.mediaNoches) || 0;
            const reservaMaxNoches = parseFloat(resultFacturacion.reservaMaxNoches) || 0;
            const reservaMinNoches = parseFloat(resultFacturacion.reservaMinNoches) || 0;

            const ingresosServicios = parseFloat(resultIngresosServicios.ingresosServicios) || 0;

            // 📌 Generar el HTML y PDF
            const html = Informes.generateHTMLInformeReservas(reservas,
                totalFacturado, mediaFacturacion, reservaMasCara, reservaMasBarata,
                totalReservas, mediaNoches, reservaMaxNoches, reservaMinNoches,
                ingresosServicios, reservasConServicio,
                servicioMasComun, porcentajeServicios
            );

            await Informes.generateAndSendPDF(html, "informe_reservas_finalizadas.pdf", res);
        } catch (error) {
            console.error("Error al generar el informe de reservas:", error);
            res.status(500).json({ error: "Error al generar el informe." });
        }
    }

}

export default Informes;
