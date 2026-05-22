/**
 * components/cards/B2bPlansCard.js
 * Componente reutilizable — muestra los 3 planes B2B originales.
 * Uso: <b2b-plans></b2b-plans>
 * Importar: <script type="module" src="/components/cards/B2bPlansCard.js"></script>
 */

class B2bPlans extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <section style="background:#f8fafc; padding:80px 20px;" id="planes-empresa">
            <div style="max-width:1200px; margin:0 auto;">
                <div style="text-align:center; margin-bottom:60px;">
                    <span style="display:inline-block; padding:5px 12px; background:rgba(16,185,129,0.15); color:#059669; border-radius:20px; font-weight:700; font-size:0.85rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">Soluciones Escalables</span>
                    <h2 style="font-size:clamp(2rem,4vw,3rem); font-weight:800; color:#0f172a; margin-bottom:15px;">Planes de Soporte para Empresas</h2>
                    <p style="font-size:1.1rem; color:#475569; max-width:650px; margin:0 auto; line-height:1.6;">
                        Elige un pago único por lote o un esquema de soporte continuo como tu departamento de TI remoto.
                    </p>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:30px; align-items:start;">

                    <!-- Plan 1: Lote Estándar -->
                    <div style="background:#fff; border-radius:24px; padding:35px; border:1px solid #e2e8f0; position:relative; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05); transition:all 0.3s ease;"
                         onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 20px 40px -10px rgba(0,0,0,0.1)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 25px -5px rgba(0,0,0,0.05)'">
                        <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); background:#64748b; color:#fff; padding:6px 15px; border-radius:20px; font-weight:700; font-size:0.85rem; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); white-space:nowrap;">6 equipos</div>
                        <div style="text-align:center; margin-bottom:25px; margin-top:10px;">
                            <h3 style="font-size:1.5rem; font-weight:800; color:#0f172a; margin-bottom:5px;">Lote Estándar</h3>
                            <p style="color:#64748b; font-size:0.95rem; margin:0;">Equipos de uso administrativo</p>
                        </div>
                        <div style="text-align:center; padding-bottom:25px; border-bottom:1px solid #f1f5f9; margin-bottom:25px;">
                            <span style="font-size:1rem; font-weight:700; color:#94a3b8; vertical-align:top;">$</span>
                            <span style="font-size:3rem; font-weight:900; color:#0f172a; line-height:1;">2,400</span>
                            <p style="color:#94a3b8; font-size:0.85rem; font-weight:600; text-transform:uppercase; margin-top:5px;">MXN · Pago único</p>
                            <span style="display:inline-block; background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:10px; font-size:0.8rem; font-weight:700; margin-top:10px;">$400 por equipo</span>
                        </div>
                        <ul style="list-style:none; padding:0; margin:0 0 30px;">
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#10b981; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Mantenimiento preventivo completo (HW + SW)</span></li>
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#10b981; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Limpieza física y revisión de antivirus</span></li>
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#10b981; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Reporte detallado por equipo al finalizar</span></li>
                            <li style="display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#10b981; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Garantía de servicio sin costo</span></li>
                        </ul>
                        <a href="/B2B#paquetes" style="display:block; width:100%; padding:14px; border-radius:12px; background:#f1f5f9; color:#0f172a; font-weight:800; border:1px solid #e2e8f0; cursor:pointer; text-align:center; text-decoration:none; transition:all 0.3s ease;"
                           onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            Ver Lote Estándar <i class="fa-solid fa-arrow-right" style="margin-left:5px;"></i>
                        </a>
                    </div>

                    <!-- Plan 2: Lote Premium (destacado) -->
                    <div style="background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%); border-radius:24px; padding:35px; border:1px solid #3b82f6; position:relative; box-shadow:0 20px 40px -10px rgba(59,130,246,0.3); transform:scale(1.03); z-index:2; transition:all 0.3s ease;"
                         onmouseover="this.style.transform='scale(1.05) translateY(-5px)'; this.style.boxShadow='0 30px 60px -15px rgba(59,130,246,0.4)'"
                         onmouseout="this.style.transform='scale(1.03)'; this.style.boxShadow='0 20px 40px -10px rgba(59,130,246,0.3)'">
                        <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); background:linear-gradient(90deg,#3b82f6,#2563eb); color:#fff; padding:6px 20px; border-radius:20px; font-weight:800; font-size:0.85rem; box-shadow:0 4px 10px -2px rgba(59,130,246,0.5); text-transform:uppercase; letter-spacing:1px; white-space:nowrap;">8 equipos</div>
                        <div style="text-align:center; margin-bottom:25px; margin-top:10px;">
                            <h3 style="font-size:1.6rem; font-weight:800; color:#fff; margin-bottom:5px;">Lote Premium</h3>
                            <p style="color:#94a3b8; font-size:0.95rem; margin:0;">Alta exigencia y renderizado</p>
                        </div>
                        <div style="text-align:center; padding-bottom:25px; border-bottom:1px solid #334155; margin-bottom:25px;">
                            <span style="font-size:1rem; font-weight:700; color:#60a5fa; vertical-align:top;">$</span>
                            <span style="font-size:3.5rem; font-weight:900; color:#fff; line-height:1;">5,000</span>
                            <p style="color:#64748b; font-size:0.85rem; font-weight:600; text-transform:uppercase; margin-top:5px;">MXN · Pago único</p>
                            <span style="display:inline-block; background:rgba(59,130,246,0.15); color:#60a5fa; padding:4px 10px; border-radius:10px; font-size:0.8rem; font-weight:700; margin-top:10px; border:1px solid rgba(59,130,246,0.3);">$625 por equipo</span>
                        </div>
                        <ul style="list-style:none; padding:0; margin:0 0 30px;">
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#60a5fa; margin-top:3px; flex-shrink:0;"></i><span style="color:#e2e8f0; font-size:0.93rem;">Todo lo del Lote Estándar incluido</span></li>
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#60a5fa; margin-top:3px; flex-shrink:0;"></i><span style="color:#e2e8f0; font-size:0.93rem;">Optimización agresiva (RAM, disco, arranque)</span></li>
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#60a5fa; margin-top:3px; flex-shrink:0;"></i><span style="color:#e2e8f0; font-size:0.93rem;">Pasta térmica de alta calidad (Arctic/Thermal Grizzly)</span></li>
                            <li style="display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#60a5fa; margin-top:3px; flex-shrink:0;"></i><span style="color:#e2e8f0; font-size:0.93rem;">Reporte fotográfico y termográfico</span></li>
                        </ul>
                        <a href="/B2B#paquetes" style="display:block; width:100%; padding:15px; border-radius:12px; background:linear-gradient(90deg,#3b82f6,#2563eb); color:#fff; font-weight:800; font-size:1.05rem; text-align:center; text-decoration:none; box-shadow:0 10px 15px -3px rgba(37,99,235,0.4); transition:all 0.3s ease;"
                           onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            Ver Lote Premium <i class="fa-solid fa-arrow-right" style="margin-left:5px;"></i>
                        </a>
                    </div>

                    <!-- Plan 3: Soporte Mensual -->
                    <div style="background:#fff; border-radius:24px; padding:35px; border:1px solid #f59e0b; position:relative; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05); transition:all 0.3s ease;"
                         onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 20px 40px -10px rgba(245,158,11,0.2)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 25px -5px rgba(0,0,0,0.05)'">
                        <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); background:#f59e0b; color:#000; padding:6px 15px; border-radius:20px; font-weight:800; font-size:0.85rem; box-shadow:0 4px 6px -1px rgba(245,158,11,0.3); white-space:nowrap;">Tu técnico fijo</div>
                        <div style="text-align:center; margin-bottom:25px; margin-top:10px;">
                            <h3 style="font-size:1.5rem; font-weight:800; color:#0f172a; margin-bottom:5px;">Soporte Mensual</h3>
                            <p style="color:#64748b; font-size:0.95rem; margin:0;">Pixon PC como tu área de TI</p>
                        </div>
                        <div style="text-align:center; padding-bottom:25px; border-bottom:1px solid #f1f5f9; margin-bottom:25px;">
                            <p style="color:#94a3b8; font-size:0.85rem; font-weight:700; margin:0;">Desde</p>
                            <span style="font-size:1rem; font-weight:700; color:#94a3b8; vertical-align:top;">$</span>
                            <span style="font-size:3rem; font-weight:900; color:#0f172a; line-height:1;">2,000</span>
                            <p style="color:#94a3b8; font-size:0.85rem; font-weight:600; text-transform:uppercase; margin-top:5px;">MXN / MES</p>
                            <span style="display:inline-block; background:rgba(245,158,11,0.1); color:#d97706; padding:4px 10px; border-radius:10px; font-size:0.8rem; font-weight:700; margin-top:10px;">Cotizado por volumen</span>
                        </div>
                        <ul style="list-style:none; padding:0; margin:0 0 30px;">
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#f59e0b; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Mantenimiento preventivo mensual incluido</span></li>
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#f59e0b; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Atención correctiva ilimitada sin costo de mano de obra</span></li>
                            <li style="margin-bottom:14px; display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#f59e0b; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Canal directo con técnico asignado</span></li>
                            <li style="display:flex; align-items:flex-start; gap:10px;"><i class="fa-solid fa-circle-check" style="color:#f59e0b; margin-top:3px; flex-shrink:0;"></i><span style="color:#334155; font-size:0.93rem;">Reporte mensual de estado de flotilla</span></li>
                        </ul>
                        <a href="/B2B#paquetes" style="display:block; width:100%; padding:14px; border-radius:12px; background:#fff; color:#d97706; font-weight:800; border:2px solid #f59e0b; text-align:center; text-decoration:none; cursor:pointer; transition:all 0.3s ease;"
                           onmouseover="this.style.background='#fffbeb'" onmouseout="this.style.background='#fff'">
                            Ver Soporte Mensual <i class="fa-solid fa-arrow-right" style="margin-left:5px;"></i>
                        </a>
                    </div>

                </div>

                <!-- Banner de confianza -->
                <div style="background:rgba(59,130,246,0.05); border:1px solid rgba(59,130,246,0.2); border-radius:16px; padding:20px; text-align:center; max-width:800px; margin:40px auto 0;">
                    <p style="margin:0; color:#475569; font-size:0.95rem; line-height:1.6;">
                        <i class="fa-solid fa-shield-halved" style="color:#3b82f6; margin-right:8px; font-size:1.2rem; vertical-align:middle;"></i>
                        Todos los planes B2B incluyen <strong>contrato formal</strong> y <strong>factura deducible (CFDI 4.0)</strong>. Si un equipo resulta dañado atribuible al servicio, <strong>Pixon PC asume la reparación sin costo adicional</strong>.
                        <a href="/B2B#faq" style="color:#2563eb; font-weight:700; text-decoration:underline; margin-left:4px;">Ver todos los planes →</a>
                    </p>
                </div>
            </div>
        </section>`;
    }
}

customElements.define('b2b-plans', B2bPlans);
