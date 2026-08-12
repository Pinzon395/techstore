# Pixon Bluetooth Optimizer

Herramienta portable para Windows 10/11 que optimiza Bluetooth sin aplicar cambios incompatibles a ciegas.

## Uso

1. Copia la carpeta `tools/windows` completa al equipo destino.
2. Haz doble clic en `Run-Bluetooth-Optimizer.cmd` y acepta el aviso de administrador.
3. Reinicia solo si la herramienta lo indica.

Opciones desde Símbolo del sistema o PowerShell:

```bat
Run-Bluetooth-Optimizer.cmd -AuditOnly
Run-Bluetooth-Optimizer.cmd -SkipDriverUpdate
Run-Bluetooth-Optimizer.cmd -Restart
```

## Qué hace

- Detecta Bluetooth antes de modificar el equipo.
- Solicita a Windows Update únicamente actualizaciones Bluetooth ya aplicables al hardware detectado, independientemente de la marca.
- Guarda un reporte y log en `%ProgramData%\PixonBluetoothOptimizer`.
- Si hay Intel Wi-Fi compatible, prefiere 5 GHz y limita 2.4 GHz a 20 MHz para reducir interferencia con Bluetooth.
- Intenta crear un punto de restauración antes de aplicar cambios.

## Qué no hace

- No instala controladores de otras marcas.
- No deshabilita dispositivos ni borra emparejamientos.
- No reinicia por su cuenta salvo al ejecutar con `-Restart`.
- No puede eliminar la latencia propia del protocolo Bluetooth. Para periféricos competitivos, un receptor dedicado de 2.4 GHz o USB sigue siendo la opción de menor latencia.
