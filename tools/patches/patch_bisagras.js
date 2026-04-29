const fs = require('fs');
let content = fs.readFileSync('reparacion-bisagras.html', 'utf8');

content = content.replace(
    '<!-- <img src="assets/images/bisagra-rota-1.jpg" style="width: 100%; height: 100%; object-fit: cover;"> -->',
    '<img src="assets/images/AntesBisagra.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Antes de reparar bisagra">'
);
content = content.replace(
    '<!-- <img src="assets/images/bisagra-reparada-1.jpg" style="width: 100%; height: 100%; object-fit: cover;"> -->',
    '<img src="assets/images/DespuesBisagra.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Después de reparar bisagra">'
);

// We have multiple instances of: <i class="fa-solid fa-image" style="font-size: 3rem; color: #94a3b8;"></i>
// We need to replace them specifically.
// The first two in the first card were replaced by the above (wait, no, the first card has the <i> and the commented out <img>)
// Actually, I can just replace the whole placeholder block.

const newCards = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                <!-- Card Galeria 1 -->
                <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="display: flex; height: 250px;">
                        <div style="flex: 1; background: #e2e8f0; display: flex; align-items: center; justify-content: center; position: relative;">
                            <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; z-index: 10;">ANTES</span>
                            <img src="assets/images/AntesBisagra.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Antes de reparar bisagra">
                        </div>
                        <div style="flex: 1; background: #cbd5e1; display: flex; align-items: center; justify-content: center; position: relative; border-left: 2px solid #fff;">
                            <span style="position: absolute; top: 10px; left: 10px; background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; z-index: 10;">DESPUÉS</span>
                            <img src="assets/images/DespuesBisagra.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Después de reparar bisagra">
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 5px;">HP Pavilion - Carcasa Desprendida</h3>
                        <p style="color: #64748b; font-size: 0.9rem; margin: 0;">Reconstrucción completa del anclaje interno con resina epóxica y ajuste de tensión.</p>
                    </div>
                </div>

                <!-- Card Galeria 2 -->
                <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="display: flex; height: 250px;">
                        <div style="flex: 1; background: #e2e8f0; display: flex; align-items: center; justify-content: center; position: relative;">
                            <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; z-index: 10;">ANTES</span>
                            <img src="assets/images/AntesBisagra2.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Antes bisagra laptop">
                        </div>
                        <div style="flex: 1; background: #cbd5e1; display: flex; align-items: center; justify-content: center; position: relative; border-left: 2px solid #fff;">
                            <span style="position: absolute; top: 10px; left: 10px; background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; z-index: 10;">DESPUÉS</span>
                            <img src="assets/images/DespuesBisagra2.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Después bisagra laptop">
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 5px;">Dell Inspiron - Bisagra Expuesta</h3>
                        <p style="color: #64748b; font-size: 0.9rem; margin: 0;">Reparación del poste de la bisagra y soldado plástico del marco de la pantalla.</p>
                    </div>
                </div>

                <!-- Card Galeria 3 (Vertical) -->
                <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="display: flex; height: 250px; background: #1e293b;">
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
                            <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; z-index: 10;">ANTES</span>
                            <img src="assets/images/AntesBisagra3.jpg" style="height: 100%; width: 100%; object-fit: contain;" alt="Antes bisagra vertical">
                        </div>
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative; border-left: 2px solid #334155;">
                            <span style="position: absolute; top: 10px; left: 10px; background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; z-index: 10;">DESPUÉS</span>
                            <img src="assets/images/DespuesBisagra3.jpg" style="height: 100%; width: 100%; object-fit: contain;" alt="Después bisagra vertical">
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 5px;">Lenovo IdeaPad - Ruptura Total</h3>
                        <p style="color: #64748b; font-size: 0.9rem; margin: 0;">Aflojamiento de la bisagra atascada y moldeado interno para recuperación estética.</p>
                    </div>
                </div>
            </div>
`;

// Replace the grid container in the file
const startPattern = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">';
const endPattern = '            <p style="text-align: center; margin-top: 30px; color: #64748b; font-size: 0.95rem;"><em>*Las imágenes';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + newCards.trim() + '\n\n' + content.substring(endIndex);
    fs.writeFileSync('reparacion-bisagras.html', content);
    console.log('reparacion-bisagras.html patched successfully');
} else {
    console.log('Pattern not found');
}
