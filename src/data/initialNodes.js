export const initialNodes = [
  { id: '1', label: 'User', position: { x: 250, y: 0 }, connectsTo: ['2'], mystery: false },
  { id: '2', label: 'CDN', position: { x: 250, y: 80 }, connectsTo: ['3'], mystery: true },
  { id: '3', label: 'Load Balancer', position: { x: 250, y: 160 }, connectsTo: ['4', '5'], mystery: false },
  { id: '4', label: 'API Server', position: { x: 150, y: 260 }, connectsTo: ['6', '7', '8'], mystery: false },
  { id: '5', label: 'API Server', position: { x: 350, y: 260 }, connectsTo: ['6', '7', '8'], mystery: false },
  { id: '6', label: 'Cache', position: { x: 100, y: 380 }, connectsTo: [], mystery: true },
  { id: '7', label: 'SQL DB', position: { x: 250, y: 380 }, connectsTo: [], mystery: true },
  { id: '8', label: 'Object Storage', position: { x: 400, y: 380 }, connectsTo: [], mystery: false },
]
