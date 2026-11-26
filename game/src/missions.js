// The five named strips and the three mission types. Each strip is a different
// landing problem: length, crosswind, gusts and fuel change what a good
// approach looks like, so picking a strip is picking a decision, not a skin.

export const MISSION_TYPES = {
  MAIL: 'Antar Surat',
  MEDEVAC: 'Medevac',
  NIGHT: 'Pendaratan Malam',
};

export const STRIPS = [
  {
    id: 0,
    name: 'Pantai Pasir',
    island: 'Pulau Pasir',
    mission: MISSION_TYPES.MAIL,
    runwayLength: 650,
    runwayNumber: '09',
    crosswind: 2,
    gust: 1,
    headwind: 2,
    fuel: 100,
    timer: 0,
    night: false,
    seed: 11,
    blurb: 'Landasan panjang di pantai. Angin tenang — tempat belajar mendarat.',
  },
  {
    id: 1,
    name: 'Kawah Merapi',
    island: 'Pulau Api',
    mission: MISSION_TYPES.MEDEVAC,
    runwayLength: 420,
    runwayNumber: '27',
    crosswind: 7,
    gust: 3,
    headwind: 1,
    fuel: 90,
    timer: 75,
    night: false,
    seed: 23,
    blurb: 'Strip pendek di kawah. Pasien menunggu — mendarat sebelum waktu habis.',
  },
  {
    id: 2,
    name: 'Tebing Karang',
    island: 'Pulau Karang',
    mission: MISSION_TYPES.MAIL,
    runwayLength: 480,
    runwayNumber: '14',
    crosswind: 9,
    gust: 4,
    headwind: 3,
    fuel: 95,
    timer: 0,
    night: false,
    seed: 37,
    blurb: 'Angin silang kencang di tebing. Terbang miring, luruskan di detik akhir.',
  },
  {
    id: 3,
    name: 'Hutan Rawa',
    island: 'Pulau Rawa',
    mission: MISSION_TYPES.MEDEVAC,
    runwayLength: 550,
    runwayNumber: '32',
    crosswind: 4,
    gust: 2,
    headwind: 2,
    fuel: 100,
    timer: 90,
    night: false,
    seed: 51,
    blurb: 'Medevac dari rawa. Kabut tipis, landasan sedang — jangan boros bahan bakar.',
  },
  {
    id: 4,
    name: 'Malam Berlampu',
    island: 'Pulau Lampu',
    mission: MISSION_TYPES.NIGHT,
    runwayLength: 600,
    runwayNumber: '18',
    crosswind: 5,
    gust: 2,
    headwind: 2,
    fuel: 100,
    timer: 0,
    night: true,
    seed: 67,
    blurb: 'Pendaratan malam: hanya lampu landasan dan PAPI yang memandumu pulang.',
  },
];

/** The strip by its number key (1-5 on the title screen). */
export function stripByIndex(index) {
  return STRIPS[Math.max(0, Math.min(STRIPS.length - 1, index))];
}
