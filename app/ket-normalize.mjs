// Ketcher allows an alternating six-membered carbon ring to be dropped on an
// existing ring carbon. The shared atom then has four neighbours and two
// double bonds (bond-order sum 6), so Ketcher renders an explicit, underlined
// C. Convert only that exact pair of atom-fused alternating rings to the
// chemically valid spiro diene form: all four bonds at the shared carbon are
// single. Charged, isotopic, radical, aliased and explicitly-valenced carbons
// are deliberately left untouched.

const isPlainCarbon = atom => atom?.label?.toLowerCase() === 'c' &&
  (atom.charge == null || atom.charge === 0) && atom.isotope == null &&
  (atom.radical == null || atom.radical === 0) && atom.alias == null &&
  atom.atomList == null && atom.rglabel == null &&
  (atom.explicitValence == null || atom.explicitValence < 0);

function alternatingSixCycle(mol, center, left, right, leftBond, rightBond, adjacency) {
  const found=[];
  const walk=(atom,pathAtoms,pathBonds)=>{
    if(pathBonds.length===4){
      if(atom===right){
        const cycle=[leftBond,...pathBonds,rightBond].map(i=>mol.bonds[i]?.type);
        if(cycle.every(t=>t===1||t===2)&&cycle.filter(t=>t===2).length===3&&cycle.every((t,i)=>t!==cycle[(i+1)%6]))
          found.push({atoms:new Set(pathAtoms),bonds:[leftBond,...pathBonds,rightBond]});
      }
      return;
    }
    for(const edge of adjacency[atom]||[]){
      if(edge.other===center||pathAtoms.includes(edge.other)||!isPlainCarbon(mol.atoms[edge.other]))continue;
      walk(edge.other,[...pathAtoms,edge.other],[...pathBonds,edge.index]);
    }
  };
  walk(left,[left],[]);
  return found;
}

function normalizeMolecule(mol) {
  if(!Array.isArray(mol.atoms)||!Array.isArray(mol.bonds))return 0;
  const adjacency=Array.from({length:mol.atoms.length},()=>[]);
  mol.bonds.forEach((bond,index)=>{
    if(!Array.isArray(bond.atoms)||bond.atoms.length!==2)return;
    const [a,b]=bond.atoms;
    if(adjacency[a]&&adjacency[b]){
      adjacency[a].push({other:b,index});
      adjacency[b].push({other:a,index});
    }
  });
  let fixes=0;
  mol.atoms.forEach((atom,center)=>{
    const incident=adjacency[center];
    if(!isPlainCarbon(atom)||incident.length!==4)return;
    if(!incident.every(e=>[1,2].includes(mol.bonds[e.index]?.type)))return;
    const doubleEdges=incident.filter(e=>mol.bonds[e.index].type===2);
    if(doubleEdges.length!==2)return;

    const cycles=[];
    for(let i=0;i<incident.length;i++)for(let j=i+1;j<incident.length;j++)
      for(const cycle of alternatingSixCycle(mol,center,incident[i].other,incident[j].other,incident[i].index,incident[j].index,adjacency))
        cycles.push({neighbors:new Set([incident[i].other,incident[j].other]),...cycle});

    const pair=cycles.some((a,ai)=>cycles.slice(ai+1).some(b=>{
      if([...a.neighbors].some(n=>b.neighbors.has(n)))return false;
      return ![...a.atoms].some(n=>b.atoms.has(n));
    }));
    if(!pair)return;
    for(const edge of doubleEdges)mol.bonds[edge.index].type=1;
    fixes++;
  });
  return fixes;
}

export function normalizeMergedAromaticRings(input) {
  let ket;
  try{ket=typeof input==='string'?JSON.parse(input):structuredClone(input);}catch{return {ket:input,fixes:0};}
  let fixes=0;
  for(const value of Object.values(ket||{}))if(value?.type==='molecule')fixes+=normalizeMolecule(value);
  return {ket:fixes?JSON.stringify(ket,null,2):input,fixes};
}
