import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Binary,
  BookOpen,
  Boxes,
  Cable,
  CheckCircle2,
  Clipboard,
  Cpu,
  GitBranch,
  Layers3,
  Play,
  Router,
  Search,
  ShieldCheck,
  Split,
  TerminalSquare,
} from 'lucide-react'
import './App.css'

const tabs = [
  { id: 'subnet', label: 'Subnetting', icon: Split },
  { id: 'converter', label: 'CIDR', icon: Binary },
  { id: 'generator', label: 'IOS', icon: TerminalSquare },
  { id: 'library', label: 'Biblioteca', icon: BookOpen },
  { id: 'routing', label: 'Routing', icon: GitBranch },
  { id: 'validator', label: 'Validador', icon: ShieldCheck },
]

const iosTypes = ['VLANs', 'Trunks', 'Access ports', 'DHCP', 'OSPF', 'NAT', 'ACLs', 'Interfaces']
const subnetTools = [
  { id: 'basic', label: 'Calculadora' },
  { id: 'equal', label: 'Subredes iguales' },
  { id: 'vlsm', label: 'VLSM' },
  { id: 'scenario', label: 'Escenario Cisco' },
]

const commandLibrary = {
  routing: [
    ['show ip route', 'Muestra la tabla de routing IPv4 y sus codigos de origen.'],
    ['ip route 0.0.0.0 0.0.0.0 <next-hop>', 'Crea una ruta estatica por defecto.'],
    ['router ospf 1', 'Entra al proceso OSPF 1 para configurar redes y areas.'],
    ['show ip protocols', 'Resume protocolos activos, timers, redes anunciadas y vecinos.'],
  ],
  switching: [
    ['show mac address-table', 'Lista MAC aprendidas por VLAN e interfaz.'],
    ['show interfaces status', 'Resume estado, VLAN, duplex y velocidad de puertos.'],
    ['switchport mode trunk', 'Fuerza un puerto como enlace troncal 802.1Q.'],
    ['spanning-tree portfast', 'Acelera puertos de acceso conectados a hosts.'],
  ],
  VLAN: [
    ['vlan <id>', 'Crea o entra a una VLAN especifica.'],
    ['name <nombre>', 'Asigna un nombre descriptivo a la VLAN actual.'],
    ['show vlan brief', 'Muestra VLANs, nombres, estado y puertos asignados.'],
    ['switchport access vlan <id>', 'Asigna un puerto access a una VLAN.'],
  ],
  troubleshooting: [
    ['ping <ip>', 'Prueba conectividad ICMP hacia un destino.'],
    ['traceroute <ip>', 'Muestra los saltos hacia una red remota.'],
    ['show running-config', 'Muestra la configuracion activa en RAM.'],
    ['show ip interface brief', 'Resume IP y estado capa 1/capa 2 por interfaz.'],
  ],
  DHCP: [
    ['ip dhcp pool <nombre>', 'Crea un pool DHCP para entregar direcciones.'],
    ['network <red> <mascara>', 'Define la red servida por el pool DHCP.'],
    ['default-router <ip>', 'Entrega gateway por defecto a los clientes.'],
    ['show ip dhcp binding', 'Muestra leases entregados por el servidor DHCP.'],
  ],
  ACL: [
    ['access-list 10 permit <red> <wildcard>', 'Crea una ACL estandar numerada.'],
    ['ip access-list extended <nombre>', 'Crea una ACL extendida nombrada.'],
    ['ip access-group <acl> in', 'Aplica una ACL entrante a una interfaz.'],
    ['show access-lists', 'Muestra reglas y contadores de coincidencias.'],
  ],
}

const demoRoutes = [
  { router: 'R1', prefix: '10.10.20.0/24', nextHop: 'LAN Estudiantes', metric: 0 },
  { router: 'R1', prefix: '10.10.0.0/16', nextHop: 'R2', metric: 10 },
  { router: 'R2', prefix: '172.16.8.0/21', nextHop: 'R3', metric: 20 },
  { router: 'R2', prefix: '0.0.0.0/0', nextHop: 'ISP', metric: 100 },
  { router: 'R3', prefix: '192.168.30.0/24', nextHop: 'LAN Lab', metric: 0 },
]

function parseIp(ip) {
  const parts = ip.trim().split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new Error('IP invalida')
  }
  return parts.reduce((acc, part) => acc * 256 + part, 0) >>> 0
}

function intToIp(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.')
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE').format(value)
}

function maskFromCidr(cidr) {
  const value = Number(cidr)
  if (!Number.isInteger(value) || value < 0 || value > 32) throw new Error('CIDR invalido')
  return value === 0 ? 0 : (0xffffffff << (32 - value)) >>> 0
}

function cidrFromMask(mask) {
  const maskInt = parseIp(mask)
  const binary = maskInt.toString(2).padStart(32, '0')
  if (!/^1*0*$/.test(binary)) throw new Error('Mascara no contigua')
  return binary.indexOf('0') === -1 ? 32 : binary.indexOf('0')
}

function subnetInfo(ip, cidr) {
  const ipInt = parseIp(ip)
  const mask = maskFromCidr(cidr)
  const network = (ipInt & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = 2 ** (32 - Number(cidr))
  const usable = cidr >= 31 ? total : Math.max(total - 2, 0)
  return {
    cidr: Number(cidr),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    first: cidr >= 31 ? intToIp(network) : intToIp(network + 1),
    last: cidr >= 31 ? intToIp(broadcast) : intToIp(broadcast - 1),
    mask: intToIp(mask),
    wildcard: intToIp((~mask >>> 0)),
    hosts: usable,
    total,
    networkInt: network,
    broadcastInt: broadcast,
  }
}

function cidrForHosts(hosts) {
  const value = Number(hosts)
  if (!Number.isInteger(value) || value < 1) throw new Error('Hosts invalidos')
  return Math.max(0, 32 - Math.ceil(Math.log2(value + 2)))
}

function buildVlsm(base, lines) {
  const [baseIp, baseCidrText = '24'] = base.split('/')
  const baseInfo = subnetInfo(baseIp, Number(baseCidrText))
  let cursor = baseInfo.networkInt
  const requests = lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [namePart, hostsPart] = line.split(',').map((part) => part.trim())
      return { name: namePart || `LAN ${index + 1}`, hosts: Number(hostsPart) }
    })
    .filter((item) => Number.isInteger(item.hosts) && item.hosts > 0)
    .sort((a, b) => b.hosts - a.hosts)

  return requests.map((item) => {
    const cidr = cidrForHosts(item.hosts)
    const size = 2 ** (32 - cidr)
    const offset = cursor % size
    if (offset !== 0) cursor += size - offset
    const info = subnetInfo(intToIp(cursor), cidr)
    cursor = info.broadcastInt + 1
    return { ...item, ...info, overflow: info.broadcastInt > baseInfo.broadcastInt }
  })
}

const MAX_VISIBLE_SUBNETS = 256

function buildEqualSubnets(base, value, mode) {
  const [baseIp, baseCidrText = '24'] = base.split('/')
  const baseCidr = Number(baseCidrText)
  const amount = Number(value)
  if (!Number.isInteger(amount) || amount < 1) throw new Error('Valor invalido')

  let newCidr
  if (mode === 'addresses') {
    const bitsForAddresses = Math.ceil(Math.log2(amount))
    newCidr = 32 - bitsForAddresses
  } else if (mode === 'hosts') {
    newCidr = cidrForHosts(amount)
  } else {
    const bitsForSubnets = Math.ceil(Math.log2(amount))
    newCidr = baseCidr + bitsForSubnets
  }

  if (newCidr > 32) throw new Error('No hay bits suficientes para crear esas subredes')
  if (newCidr < baseCidr) throw new Error('El bloque solicitado es mas grande que la red base')
  const baseInfo = subnetInfo(baseIp, baseCidr)
  const blockSize = 2 ** (32 - newCidr)
  const possibleSubnets = 2 ** (newCidr - baseCidr)
  const count = mode === 'subnets' ? Math.min(amount, possibleSubnets) : possibleSubnets
  const visibleCount = Math.min(count, MAX_VISIBLE_SUBNETS)

  return {
    base: `${baseInfo.network}/${baseCidr}`,
    newCidr,
    blockSize,
    possibleSubnets,
    requested: amount,
    renderedRows: visibleCount,
    totalRows: count,
    truncated: count > visibleCount,
    rows: Array.from({ length: visibleCount }, (_, index) => {
      const info = subnetInfo(intToIp(baseInfo.networkInt + blockSize * index), newCidr)
      return { number: index + 1, ...info }
    }),
  }
}

function parseCiscoScenario(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const baseLine = lines.find((line) => /red\s*base/i.test(line))
  const base =
    baseLine?.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/)?.[1] ||
    lines.find((line) => /^\d+\.\d+\.\d+\.\d+\/\d+$/.test(line)) ||
    '192.168.0.0/24'
  const requests = []
  let currentSite = ''
  let readingLinks = false

  lines.forEach((line) => {
    if (/red\s*base/i.test(line) || /^\d+\.\d+\.\d+\.\d+\/\d+$/.test(line)) return
    if (/^enlaces/i.test(line)) {
      readingLinks = true
      return
    }

    const linkMatch = line.match(/^([A-Za-z0-9]+)\s*[-/]\s*([A-Za-z0-9]+)$/)
    if (readingLinks && linkMatch) {
      requests.push({ name: `${linkMatch[1].toUpperCase()}-${linkMatch[2].toUpperCase()}`, hosts: 2, type: 'Enlace WAN /30' })
      return
    }

    const siteOnly = line.match(/^([A-Za-z0-9]{2,12})$/)
    if (siteOnly && !readingLinks) {
      currentSite = siteOnly[1].toUpperCase()
      return
    }

    const hostMatch = line.match(/^(?:([A-Za-z0-9]+).*?)?(\d+)\s*(empleados|hosts|servidores|servers|pcs|usuarios)/i)
    if (hostMatch) {
      const site = (currentSite || hostMatch[1] || 'LAN').toUpperCase()
      requests.push({
        name: `${site} LAN`,
        hosts: Number(hostMatch[2]),
        type: hostMatch[3].toLowerCase().includes('server') || hostMatch[3].toLowerCase().includes('servid') ? 'Servidores' : 'Usuarios',
      })
    }
  })

  const vlsmLines = requests.map((item) => `${item.name}, ${item.hosts}`).join('\n')
  return { base, rows: buildVlsm(base, vlsmLines).map((row) => ({ ...row, type: requests.find((item) => item.name === row.name)?.type || 'LAN' })) }
}

function routeMatch(destination, route) {
  const [ip, cidr] = route.prefix.split('/')
  const destInt = parseIp(destination)
  const routeInt = parseIp(ip)
  const mask = maskFromCidr(Number(cidr))
  return (destInt & mask) >>> 0 === (routeInt & mask) >>> 0
}

function generateIos(type, form) {
  const f = { ...form }
  switch (type) {
    case 'VLANs':
      return `enable
configure terminal
vlan ${f.vlanId || '10'}
 name ${f.vlanName || 'ESTUDIANTES'}
exit
end
write memory`
    case 'Trunks':
      return `configure terminal
interface ${f.interfaceName || 'GigabitEthernet0/1'}
 switchport mode trunk
 switchport trunk native vlan ${f.nativeVlan || '99'}
 switchport trunk allowed vlan ${f.allowedVlans || '10,20,30,99'}
 no shutdown
end`
    case 'Access ports':
      return `configure terminal
interface ${f.interfaceName || 'FastEthernet0/10'}
 switchport mode access
 switchport access vlan ${f.vlanId || '10'}
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
end`
    case 'DHCP':
      return `configure terminal
ip dhcp excluded-address ${f.excludedStart || '192.168.10.1'} ${f.excludedEnd || '192.168.10.20'}
ip dhcp pool ${f.poolName || 'LAN_ESTUDIANTES'}
 network ${f.network || '192.168.10.0'} ${f.mask || '255.255.255.0'}
 default-router ${f.gateway || '192.168.10.1'}
 dns-server ${f.dns || '8.8.8.8'}
end`
    case 'OSPF':
      return `configure terminal
router ospf ${f.processId || '1'}
 router-id ${f.routerId || '1.1.1.1'}
 network ${f.network || '192.168.10.0'} ${f.wildcard || '0.0.0.255'} area ${f.area || '0'}
 passive-interface default
 no passive-interface ${f.interfaceName || 'GigabitEthernet0/0'}
end`
    case 'NAT':
      return `configure terminal
access-list ${f.aclNumber || '1'} permit ${f.network || '192.168.10.0'} ${f.wildcard || '0.0.0.255'}
interface ${f.insideInterface || 'GigabitEthernet0/0'}
 ip nat inside
exit
interface ${f.outsideInterface || 'GigabitEthernet0/1'}
 ip nat outside
exit
ip nat inside source list ${f.aclNumber || '1'} interface ${f.outsideInterface || 'GigabitEthernet0/1'} overload
end`
    case 'ACLs':
      return `configure terminal
ip access-list extended ${f.aclName || 'PERMITIR_WEB'}
 permit tcp ${f.source || '192.168.10.0 0.0.0.255'} ${f.destination || 'any'} eq ${f.port || '80'}
 deny ip any any log
exit
interface ${f.interfaceName || 'GigabitEthernet0/0'}
 ip access-group ${f.aclName || 'PERMITIR_WEB'} ${f.direction || 'in'}
end`
    case 'Interfaces':
      return `configure terminal
interface ${f.interfaceName || 'GigabitEthernet0/0'}
 description ${f.description || 'Enlace LAN'}
 ip address ${f.ip || '192.168.10.1'} ${f.mask || '255.255.255.0'}
 no shutdown
end`
    default:
      return ''
  }
}

function validateConfig(config) {
  const findings = []
  const ipOwners = new Map()
  let currentInterface = null

  config.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim()
    const lineNo = index + 1
    const interfaceMatch = line.match(/^interface\s+(.+)/i)
    if (interfaceMatch) currentInterface = interfaceMatch[1]

    if (/^ip\s+adress\b/i.test(line)) {
      findings.push({ level: 'error', line: lineNo, text: 'Posible typo: usa "ip address", no "ip adress".' })
    }

    const ipMatch = line.match(/^ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/i)
    if (ipMatch) {
      const [, ip, mask] = ipMatch
      try {
        parseIp(ip)
        cidrFromMask(mask)
      } catch (error) {
        findings.push({ level: 'error', line: lineNo, text: `IP o mascara invalida: ${error.message}.` })
      }
      if (ipOwners.has(ip)) {
        findings.push({
          level: 'error',
          line: lineNo,
          text: `IP duplicada ${ip}; ya aparece en ${ipOwners.get(ip)}.`,
        })
      } else {
        ipOwners.set(ip, currentInterface || `linea ${lineNo}`)
      }
    }

    if (/^shutdown$/i.test(line) && currentInterface) {
      findings.push({ level: 'warn', line: lineNo, text: `${currentInterface} esta apagada con shutdown.` })
    }

    if (/^vlan\s+\D/i.test(line)) {
      findings.push({ level: 'error', line: lineNo, text: 'El ID de VLAN debe ser numerico.' })
    }

    if (/^router\s+ospf$/i.test(line)) {
      findings.push({ level: 'warn', line: lineNo, text: 'OSPF necesita un process-id, por ejemplo: router ospf 1.' })
    }

    if (/^switchport\s+acces\b/i.test(line)) {
      findings.push({ level: 'error', line: lineNo, text: 'Posible typo: usa "switchport access".' })
    }
  })

  return findings
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

function ResultGrid({ items }) {
  return (
    <div className="result-grid">
      {items.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('subnet')
  const [subnetTool, setSubnetTool] = useState('basic')
  const [subnetIp, setSubnetIp] = useState('192.168.10.34')
  const [subnetMode, setSubnetMode] = useState('cidr')
  const [subnetValue, setSubnetValue] = useState('24')
  const [vlsmBase, setVlsmBase] = useState('192.168.10.0/24')
  const [vlsmLines, setVlsmLines] = useState('Administracion, 58\nLaboratorio, 26\nWireless, 12\nInvitados, 6')
  const [equalBase, setEqualBase] = useState('10.0.0.0/8')
  const [equalCount, setEqualCount] = useState('8')
  const [equalMode, setEqualMode] = useState('subnets')
  const [equalTableStyle, setEqualTableStyle] = useState('simple')
  const [scenarioText, setScenarioText] = useState(`Red base:
192.168.0.0/24
CDMX
Oficina de 50 empleados
GDL
DC de 10 servers
MER
Oficina de 100 empleados
Enlaces:
CDMX-GDL
CDMX-MER
MER-GDL`)
  const [converterInput, setConverterInput] = useState('/24')
  const [iosType, setIosType] = useState('VLANs')
  const [iosForm, setIosForm] = useState({})
  const [libraryFilter, setLibraryFilter] = useState('')
  const [destination, setDestination] = useState('10.10.20.45')
  const [configText, setConfigText] = useState(`interface GigabitEthernet0/0
 ip address 192.168.10.1 255.255.255.0
 no shutdown
interface GigabitEthernet0/1
 ip address 192.168.10.1 255.255.255.0
 shutdown
router ospf
 network 192.168.10.0 0.0.0.255 area 0`)

  const subnetResult = useMemo(() => {
    try {
      const cidr = subnetMode === 'cidr' ? Number(subnetValue) : cidrForHosts(subnetValue)
      return { data: subnetInfo(subnetIp, cidr) }
    } catch (error) {
      return { error: error.message }
    }
  }, [subnetIp, subnetMode, subnetValue])

  const vlsmResult = useMemo(() => {
    try {
      return { data: buildVlsm(vlsmBase, vlsmLines) }
    } catch (error) {
      return { error: error.message }
    }
  }, [vlsmBase, vlsmLines])

  const equalSubnetResult = useMemo(() => {
    try {
      return { data: buildEqualSubnets(equalBase, equalCount, equalMode) }
    } catch (error) {
      return { error: error.message }
    }
  }, [equalBase, equalCount, equalMode])

  const scenarioResult = useMemo(() => {
    try {
      return { data: parseCiscoScenario(scenarioText) }
    } catch (error) {
      return { error: error.message }
    }
  }, [scenarioText])

  const converterResult = useMemo(() => {
    try {
      const raw = converterInput.trim()
      const cidr = raw.startsWith('/') ? Number(raw.slice(1)) : cidrFromMask(raw)
      const mask = maskFromCidr(cidr)
      return { data: { cidr, mask: intToIp(mask), wildcard: intToIp(~mask >>> 0) } }
    } catch (error) {
      return { error: error.message }
    }
  }, [converterInput])

  const bestRoute = useMemo(() => {
    try {
      return demoRoutes
        .filter((route) => routeMatch(destination, route))
        .sort((a, b) => Number(b.prefix.split('/')[1]) - Number(a.prefix.split('/')[1]))[0]
    } catch {
      return null
    }
  }, [destination])

  const validation = useMemo(() => validateConfig(configText), [configText])
  const iosOutput = useMemo(() => generateIos(iosType, iosForm), [iosType, iosForm])

  const setFormValue = (key, value) => setIosForm((current) => ({ ...current, [key]: value }))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Router size={25} />
            <span>NA</span>
          </div>
          <div>
            <strong>NetLab Assistant</strong>
            <span>Redes 2 + Cisco IOS</span>
          </div>
        </div>
        <nav>
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                className={activeTab === tab.id ? 'nav-item active' : 'nav-item'}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="status-panel">
          <Cpu size={18} />
          <span>Modo practica</span>
          <strong>Offline ready</strong>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard tecnico</p>
            <h1>Asistente inteligente para tareas y laboratorios de redes</h1>
          </div>
          <div className="top-actions">
            <span><CheckCircle2 size={16} /> Subnetting</span>
            <span><Router size={16} /> IOS</span>
            <span><Cable size={16} /> Routing</span>
          </div>
        </header>

        {activeTab === 'subnet' && (
          <section className="workspace">
            <div className="tool-switcher">
              {subnetTools.map((tool) => (
                <button
                  className={subnetTool === tool.id ? 'selected' : ''}
                  key={tool.id}
                  onClick={() => setSubnetTool(tool.id)}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <div className="practice-strip">
              <div>
                <strong>Guia rapida</strong>
                <span>Usa subredes iguales para tablas de examen, VLSM para Packet Tracer con sedes y enlaces, y calculadora para revisar una IP puntual.</span>
              </div>
            </div>

            {subnetTool === 'basic' && (
              <div className="panel wide-panel">
                <div className="panel-heading">
                  <h2>Calculadora de subnetting</h2>
                  <p>Calcula red, broadcast, mascara, wildcard y rango usable.</p>
                </div>
                <div className="quick-actions">
                  <button onClick={() => { setSubnetIp('192.168.0.10'); setSubnetMode('cidr'); setSubnetValue('27') }}>
                    LAN /27
                  </button>
                  <button onClick={() => { setSubnetIp('10.0.5.130'); setSubnetMode('cidr'); setSubnetValue('25') }}>
                    Red /25
                  </button>
                  <button onClick={() => { setSubnetIp('172.16.20.77'); setSubnetMode('hosts'); setSubnetValue('60') }}>
                    60 hosts
                  </button>
                </div>
                <div className="form-grid relaxed">
                  <Field label="IP base" value={subnetIp} onChange={setSubnetIp} placeholder="192.168.10.34" />
                  <label className="field">
                    <span>Modo</span>
                    <select value={subnetMode} onChange={(event) => setSubnetMode(event.target.value)}>
                      <option value="cidr">CIDR</option>
                      <option value="hosts">Cantidad de hosts</option>
                    </select>
                  </label>
                  <Field
                    label={subnetMode === 'cidr' ? 'CIDR' : 'Hosts requeridos'}
                    value={subnetValue}
                    onChange={setSubnetValue}
                    placeholder={subnetMode === 'cidr' ? '24' : '60'}
                  />
                </div>
                {subnetResult.error ? (
                  <p className="error">{subnetResult.error}</p>
                ) : (
                  <ResultGrid
                    items={[
                      ['Subnet address', `${subnetResult.data.network}/${subnetResult.data.cidr}`],
                      ['Broadcast', subnetResult.data.broadcast],
                      ['Rango usable', `${subnetResult.data.first} - ${subnetResult.data.last}`],
                      ['Mascara decimal', subnetResult.data.mask],
                      ['Wildcard mask', subnetResult.data.wildcard],
                      ['Hosts utiles', subnetResult.data.hosts],
                    ]}
                  />
                )}
              </div>
            )}

            {subnetTool === 'vlsm' && (
              <div className="panel wide-panel">
                <div className="panel-heading">
                  <h2>VLSM</h2>
                  <p>Escribe una red base y una lista por linea: nombre, hosts.</p>
                </div>
                <div className="quick-actions">
                  <button onClick={() => { setVlsmBase('192.168.10.0/24'); setVlsmLines('Administracion, 58\nLaboratorio, 26\nWireless, 12\nInvitados, 6') }}>
                    Campus pequeno
                  </button>
                  <button onClick={() => { setVlsmBase('10.10.0.0/23'); setVlsmLines('Ventas, 100\nSoporte, 50\nAulas, 25\nCamaras, 10\nGestion, 5') }}>
                    Empresa /23
                  </button>
                </div>
                <div className="form-grid relaxed">
                  <Field label="Red base" value={vlsmBase} onChange={setVlsmBase} placeholder="192.168.10.0/24" />
                  <label className="field full">
                    <span>Subredes</span>
                    <textarea value={vlsmLines} onChange={(event) => setVlsmLines(event.target.value)} rows="7" />
                  </label>
                </div>
                {vlsmResult.error ? <p className="error">{vlsmResult.error}</p> : <VlsmTable rows={vlsmResult.data} />}
              </div>
            )}

            {subnetTool === 'equal' && (
              <div className="panel wide-panel">
                <div className="panel-heading">
                  <h2>Subredes iguales</h2>
                  <p>Divide una red en N subredes del mismo tamano, como la tabla de rango IP.</p>
                </div>
                <div className="quick-actions">
                  <button onClick={() => { setEqualBase('192.168.0.0/24'); setEqualMode('addresses'); setEqualCount('32'); setEqualTableStyle('simple') }}>
                    Tabla /27 como calculadora
                  </button>
                  <button onClick={() => { setEqualBase('10.0.0.0/8'); setEqualMode('subnets'); setEqualCount('8'); setEqualTableStyle('technical') }}>
                    10.0.0.0 en 8 partes
                  </button>
                  <button onClick={() => { setEqualBase('192.168.1.0/24'); setEqualMode('hosts'); setEqualCount('14'); setEqualTableStyle('simple') }}>
                    14 hosts por subred
                  </button>
                </div>
                <div className="form-grid relaxed">
                  <Field label="Red base" value={equalBase} onChange={setEqualBase} placeholder="10.0.0.0/8" />
                  <label className="field">
                    <span>Calcular por</span>
                    <select value={equalMode} onChange={(event) => setEqualMode(event.target.value)}>
                      <option value="subnets">Numero de subredes</option>
                      <option value="addresses">Direcciones por subred</option>
                      <option value="hosts">Hosts por subred</option>
                    </select>
                  </label>
                  <Field
                    label={
                      equalMode === 'addresses'
                        ? 'Direcciones por subred'
                        : equalMode === 'hosts'
                          ? 'Hosts por subred'
                          : 'Numero de subredes'
                    }
                    value={equalCount}
                    onChange={setEqualCount}
                    placeholder={equalMode === 'subnets' ? '8' : '32'}
                  />
                  <label className="field">
                    <span>Vista de tabla</span>
                    <select value={equalTableStyle} onChange={(event) => setEqualTableStyle(event.target.value)}>
                      <option value="simple">Detalles de subred</option>
                      <option value="technical">Tecnica completa</option>
                    </select>
                  </label>
                </div>
                {equalSubnetResult.error ? (
                  <p className="error">{equalSubnetResult.error}</p>
                ) : (
                  <EqualSubnetsTable data={equalSubnetResult.data} styleMode={equalTableStyle} />
                )}
              </div>
            )}

            {subnetTool === 'scenario' && (
              <div className="panel wide-panel">
                <div className="panel-heading">
                  <h2>Escenario Cisco / Packet Tracer</h2>
                  <p>Pega red base, sedes y enlaces; genera LANs y enlaces WAN con VLSM.</p>
                </div>
                <div className="quick-actions">
                  <button onClick={() => setScenarioText(`Red base:
192.168.0.0/24
CDMX
Oficina de 50 empleados
GDL
DC de 10 servers
MER
Oficina de 100 empleados
Enlaces:
CDMX-GDL
CDMX-MER
MER-GDL`)}>
                    Topologia 3 routers
                  </button>
                  <button onClick={() => setScenarioText(`Red base:
10.20.0.0/22
HQ
Oficina de 180 empleados
BR1
Oficina de 70 empleados
BR2
Oficina de 35 empleados
DC
DC de 20 servers
Enlaces:
HQ-BR1
HQ-BR2
HQ-DC`)}>
                    Sedes + DC
                  </button>
                </div>
                <label className="field full">
                  <span>Enunciado del laboratorio</span>
                  <textarea value={scenarioText} onChange={(event) => setScenarioText(event.target.value)} rows="11" />
                </label>
                {scenarioResult.error ? (
                  <p className="error">{scenarioResult.error}</p>
                ) : (
                  <>
                    <div className="scenario-summary">
                      <span>Red base detectada</span>
                      <strong>{scenarioResult.data.base}</strong>
                    </div>
                    <ScenarioTable rows={scenarioResult.data.rows} />
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'converter' && (
          <section className="workspace">
            <div className="panel compact-panel">
              <div className="panel-heading">
                <h2>Conversor CIDR, mascara y wildcard</h2>
                <p>Acepta valores como /24 o 255.255.255.0.</p>
              </div>
              <Field label="Entrada" value={converterInput} onChange={setConverterInput} placeholder="/24" />
              {converterResult.error ? (
                <p className="error">{converterResult.error}</p>
              ) : (
                <ResultGrid
                  items={[
                    ['CIDR', `/${converterResult.data.cidr}`],
                    ['Mascara', converterResult.data.mask],
                    ['Wildcard', converterResult.data.wildcard],
                  ]}
                />
              )}
            </div>
          </section>
        )}

        {activeTab === 'generator' && (
          <section className="workspace two-columns">
            <div className="panel">
              <div className="panel-heading">
                <h2>Generador Cisco IOS</h2>
                <p>Completa los campos necesarios y copia la configuracion final.</p>
              </div>
              <div className="segmented">
                {iosTypes.map((type) => (
                  <button className={iosType === type ? 'selected' : ''} key={type} onClick={() => setIosType(type)}>
                    {type}
                  </button>
                ))}
              </div>
              <IosFields type={iosType} form={iosForm} setValue={setFormValue} />
            </div>
            <div className="panel terminal-panel">
              <div className="panel-heading row-heading">
                <h2>Comandos listos</h2>
                <button className="icon-button" title="Copiar comandos" onClick={() => navigator.clipboard?.writeText(iosOutput)}>
                  <Clipboard size={18} />
                </button>
              </div>
              <pre>{iosOutput}</pre>
            </div>
          </section>
        )}

        {activeTab === 'library' && (
          <section className="workspace">
            <div className="panel">
              <div className="panel-heading row-heading">
                <div>
                  <h2>Biblioteca de comandos</h2>
                  <p>Comandos comunes de routing, switching, VLAN, troubleshooting, DHCP y ACL.</p>
                </div>
                <label className="search-box">
                  <Search size={16} />
                  <input value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value)} placeholder="Buscar" />
                </label>
              </div>
              <div className="library-grid">
                {Object.entries(commandLibrary).map(([category, commands]) => {
                  const filtered = commands.filter(([command, description]) =>
                    `${command} ${description} ${category}`.toLowerCase().includes(libraryFilter.toLowerCase()),
                  )
                  if (!filtered.length) return null
                  return (
                    <div className="command-section" key={category}>
                      <h3>{category}</h3>
                      {filtered.map(([command, description]) => (
                        <div className="command-row" key={command}>
                          <code>{command}</code>
                          <span>{description}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'routing' && (
          <section className="workspace two-columns">
            <div className="panel">
              <div className="panel-heading">
                <h2>Simulador visual de routing</h2>
                <p>Evalua rutas con longest prefix match y muestra el siguiente salto.</p>
              </div>
              <Field label="IP destino del paquete" value={destination} onChange={setDestination} placeholder="10.10.20.45" />
              <div className="route-visual">
                {['Host A', 'R1', bestRoute?.nextHop || 'Sin ruta'].map((node, index) => (
                  <div className="route-node" key={`${node}-${index}`}>
                    <span>{index === 0 ? <Boxes size={18} /> : index === 1 ? <Router size={18} /> : <Play size={18} />}</span>
                    <strong>{node}</strong>
                  </div>
                ))}
              </div>
              <div className="explain-box">
                <Layers3 size={18} />
                {bestRoute ? (
                  <p>
                    La ruta ganadora es <strong>{bestRoute.prefix}</strong> porque tiene el prefijo mas especifico entre las
                    rutas que contienen {destination}. Ese es el principio de longest prefix match.
                  </p>
                ) : (
                  <p>No hay coincidencia valida para ese destino. Revisa el formato de la IP o agrega una ruta por defecto.</p>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <h2>Tabla de routing simplificada</h2>
                <p>Las coincidencias se resaltan segun el destino ingresado.</p>
              </div>
              <div className="route-table">
                {demoRoutes.map((route) => {
                  let matches
                  try {
                    matches = routeMatch(destination, route)
                  } catch {
                    matches = false
                  }
                  return (
                    <div className={matches ? 'route-entry match' : 'route-entry'} key={`${route.router}-${route.prefix}`}>
                      <span>{route.router}</span>
                      <strong>{route.prefix}</strong>
                      <span>{route.nextHop}</span>
                      <em>metric {route.metric}</em>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'validator' && (
          <section className="workspace two-columns">
            <div className="panel">
              <div className="panel-heading">
                <h2>Validador de configuraciones</h2>
                <p>Pega configuracion Cisco para detectar errores comunes antes del laboratorio.</p>
              </div>
              <label className="field full">
                <span>Running config</span>
                <textarea className="config-input" value={configText} onChange={(event) => setConfigText(event.target.value)} rows="18" />
              </label>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <h2>Diagnostico</h2>
                <p>IPs duplicadas, mascaras invalidas, interfaces apagadas y sintaxis sospechosa.</p>
              </div>
              <div className="findings">
                {validation.length === 0 ? (
                  <div className="finding ok">
                    <CheckCircle2 size={18} />
                    <span>No se detectaron problemas basicos.</span>
                  </div>
                ) : (
                  validation.map((finding) => (
                    <div className={`finding ${finding.level}`} key={`${finding.line}-${finding.text}`}>
                      <AlertTriangle size={18} />
                      <span>
                        <strong>Linea {finding.line}:</strong> {finding.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function VlsmTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Segmento</th>
            <th>Hosts</th>
            <th>Red</th>
            <th>Usable</th>
            <th>Broadcast</th>
            <th>Mascara</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.overflow ? 'overflow' : ''} key={`${row.name}-${row.network}`}>
              <td>{row.name}</td>
              <td>{row.hosts}</td>
              <td>{row.network}/{row.cidr}</td>
              <td>{row.first} - {row.last}</td>
              <td>{row.broadcast}</td>
              <td>{row.mask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EqualSubnetsTable({ data, styleMode }) {
  const { rows } = data
  const simple = styleMode === 'simple'

  return (
    <div className={simple ? 'table-wrap calculator-table' : 'table-wrap'}>
      <div className="subnet-summary">
        <div>
          <span>Bloque de red</span>
          <strong>{data.base}</strong>
        </div>
        <div>
          <span>Nuevo CIDR</span>
          <strong>/{data.newCidr}</strong>
        </div>
        <div>
          <span>Direcciones por subred</span>
          <strong>{formatNumber(data.blockSize)}</strong>
        </div>
        <div>
          <span>Subredes posibles</span>
          <strong>{formatNumber(data.possibleSubnets)}</strong>
        </div>
        <div>
          <span>Filas mostradas</span>
          <strong>{formatNumber(data.renderedRows)} de {formatNumber(data.totalRows)}</strong>
        </div>
      </div>
      {data.truncated && (
        <p className="table-warning">
          Hay demasiadas subredes para mostrarlas todas sin pegar el navegador. Se muestran las primeras {formatNumber(data.renderedRows)}.
          Usa una red base mas pequena o un bloque mas grande para ver la tabla completa.
        </p>
      )}
      {simple ? (
        <>
          <h3 className="table-title">Detalles de subred</h3>
          <table>
            <thead>
              <tr>
                <th>Subnet ID</th>
                <th>Subnet Address</th>
                <th>Host Address Range</th>
                <th>Broadcast Address</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.number}-${row.network}`}>
                  <td>{row.number}</td>
                  <td>{row.network}</td>
                  <td>{row.first} - {row.last}</td>
                  <td>{row.broadcast}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <table>
          <thead>
            <tr>
              <th>No. de Subred</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Hosts asignables</th>
              <th>Mascara</th>
              <th>Wildcard</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.number}-${row.network}`}>
                <td>{row.number}</td>
                <td>{row.network}</td>
                <td>{row.broadcast}</td>
                <td>{formatNumber(row.hosts)}</td>
                <td>{row.mask} /{row.cidr}</td>
                <td>{row.wildcard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="table-note">
        La primera y la ultima direccion del rango son red y broadcast; no se asignan a hosts. Si pides 24 subredes
        dentro de un /24, se reservan 5 bits y realmente caben 32 subredes /29; por eso cada bloque tiene 8 direcciones.
      </p>
    </div>
  )
}

function ScenarioTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Segmento Cisco</th>
            <th>Tipo</th>
            <th>Hosts</th>
            <th>Red/CIDR</th>
            <th>Rango usable</th>
            <th>Gateway sugerido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.overflow ? 'overflow' : ''} key={`${row.name}-${row.network}`}>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td>{row.hosts}</td>
              <td>{row.network}/{row.cidr}</td>
              <td>{row.first} - {row.last}</td>
              <td>{row.first}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IosFields({ type, form, setValue }) {
  const common = {
    vlanId: ['VLAN ID', '10'],
    vlanName: ['Nombre VLAN', 'ESTUDIANTES'],
    interfaceName: ['Interfaz', 'GigabitEthernet0/1'],
    nativeVlan: ['Native VLAN', '99'],
    allowedVlans: ['VLANs permitidas', '10,20,30,99'],
    poolName: ['Pool DHCP', 'LAN_ESTUDIANTES'],
    network: ['Red', '192.168.10.0'],
    mask: ['Mascara', '255.255.255.0'],
    gateway: ['Gateway', '192.168.10.1'],
    dns: ['DNS', '8.8.8.8'],
    excludedStart: ['Excluida inicio', '192.168.10.1'],
    excludedEnd: ['Excluida fin', '192.168.10.20'],
    processId: ['Process ID', '1'],
    routerId: ['Router ID', '1.1.1.1'],
    wildcard: ['Wildcard', '0.0.0.255'],
    area: ['Area', '0'],
    aclNumber: ['ACL numero', '1'],
    insideInterface: ['Interfaz inside', 'GigabitEthernet0/0'],
    outsideInterface: ['Interfaz outside', 'GigabitEthernet0/1'],
    aclName: ['Nombre ACL', 'PERMITIR_WEB'],
    source: ['Origen', '192.168.10.0 0.0.0.255'],
    destination: ['Destino', 'any'],
    port: ['Puerto', '80'],
    direction: ['Direccion', 'in'],
    ip: ['IP interfaz', '192.168.10.1'],
    description: ['Descripcion', 'Enlace LAN'],
  }

  const fieldsByType = {
    VLANs: ['vlanId', 'vlanName'],
    Trunks: ['interfaceName', 'nativeVlan', 'allowedVlans'],
    'Access ports': ['interfaceName', 'vlanId'],
    DHCP: ['poolName', 'network', 'mask', 'gateway', 'dns', 'excludedStart', 'excludedEnd'],
    OSPF: ['processId', 'routerId', 'network', 'wildcard', 'area', 'interfaceName'],
    NAT: ['aclNumber', 'network', 'wildcard', 'insideInterface', 'outsideInterface'],
    ACLs: ['aclName', 'source', 'destination', 'port', 'interfaceName', 'direction'],
    Interfaces: ['interfaceName', 'description', 'ip', 'mask'],
  }

  return (
    <div className="form-grid">
      {fieldsByType[type].map((key) => (
        <Field
          key={key}
          label={common[key][0]}
          value={form[key] || ''}
          onChange={(value) => setValue(key, value)}
          placeholder={common[key][1]}
        />
      ))}
    </div>
  )
}

export default App
