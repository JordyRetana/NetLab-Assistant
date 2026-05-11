# NetLab Assistant

NetLab Assistant es una aplicacion web para estudiantes de Redes 2 y Cisco Networking. Ayuda a resolver tareas de subnetting, preparar laboratorios de Packet Tracer y generar comandos Cisco IOS listos para copiar.

## Funciones

- Calculadora de subnetting por CIDR o cantidad de hosts.
- Subredes iguales con vista de tabla tipo calculadora.
- VLSM para escenarios con varias LANs.
- Planificador de escenarios Cisco con sedes y enlaces WAN.
- Conversor CIDR, mascara decimal y wildcard.
- Generador de comandos Cisco IOS para VLANs, trunks, access ports, DHCP, OSPF, NAT, ACLs e interfaces.
- Biblioteca de comandos comunes por categoria.
- Simulador visual de routing con longest prefix match.
- Validador basico de configuraciones Cisco.

## Tecnologias

- React
- Vite
- Lucide React
- CSS responsive sin framework externo

## Uso local

```bash
npm install
npm run dev
```

Luego abre:

```txt
http://127.0.0.1:5174
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## GitHub Pages

El proyecto esta configurado para publicarse en GitHub Pages usando la rama `gh-pages`.

La configuracion importante esta en:

- `vite.config.js`: usa `base: '/NetLab-Assistant/'`
- `.github/workflows/deploy.yml`: compila desde `main` y publica el contenido de `dist` en `gh-pages`

En GitHub, configura Pages con:

- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`

URL esperada despues del despliegue:

```txt
https://jordyretana.github.io/NetLab-Assistant/
```
