// Writes the two arcade cabinets, exactly as the site builds them, to MagicaVoxel files you can
// open and remodel: voxel/arcade-blue.vox and voxel/arcade-red.vox (2 cm voxels, 43 × 50 × 113).
//   node voxel/export-arcade.mjs
import { writeFileSync } from 'node:fs'
import { buildCabinet } from '../src/lib/arcadeCabinet.js'
import { toVox } from '../src/lib/voxels.js'
import { zoneById } from '../src/data/zones.js'

for (const id of ['arcade-blue', 'arcade-red']) {
  const zone = zoneById(id)
  const { grid, palette } = buildCabinet(zone.cabinet, zone.screen)
  const file = new URL(`./${id}.vox`, import.meta.url)
  writeFileSync(file, toVox(grid, palette))
  console.log(`${id}.vox  ${grid.n[0]} wide × ${grid.n[2]} deep × ${grid.n[1]} tall`)
}
