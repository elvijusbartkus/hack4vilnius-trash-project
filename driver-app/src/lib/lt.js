// Lithuanian number agreement: 1 konteineris, 2 konteineriai, 10 konteinerių.
// Teens and round tens take the genitive plural; 21, 31… go back to singular.
export function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`
  return `${n} ${many}`
}
