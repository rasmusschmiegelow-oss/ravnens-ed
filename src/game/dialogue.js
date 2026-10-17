'use strict';
/* =========================================================
   DIALOGUE + DICE
   ========================================================= */
const F=()=>G.flags;
const D={
  ulfr(){
    const f=F();
    if(!f.metUlfr){f.metUlfr=true;return ulfrHub('Den gamle mand læner sig på sin stav og ser længe på dig. «Endnu en, der vågnede ved stenen. Ravnene førte dig hertil, gjorde de ikke? Fimbulvinteren har varet i tre år. Rimtursen Hrimgrimr sidder bag Jötunporten i nord og ånder frost over Midgard. Porten åbnes kun med Jarlens Horn, og hornet ligger i gravhøjen mod vest hos Hrafnkel, der nægtede at dø.»');}
    if(!f.horn) return ulfrHub('«Vest, forbi den døde skov og ad den gamle sti. Gravhøjen står bag en ring af sten. Hrafnkel slår hårdt, men langsomt. Rul ind under hans hug, ikke væk fra dem.»');
    if(!f.gateOpen&&!f.vogterDead) return ulfrHub('Ulfr ser hornet i dit bælte og lukker øjnene. «Så har han fået fred. Nu hvor Hrafnkel er borte, er døren i højen ikke længere forseglet. Hans gravvogter ligger dernede med skatte fra den gamle tid. Gå derned, hvis du tør, eller gå nordpå til porten.»');
    if(!f.gateOpen) return ulfrHub('Ulfr ser hornet i dit bælte og lukker øjnene. «Så har han fået fred. Gå nordpå til porten. Blæs, og lad Rimtursen høre, at Midgard ikke er død endnu.»');
    return ulfrHub('«Ravnene flyver lavt i dag. Vend tilbage med livet i behold.»');
  },
  dvalin(){
    const f=F(); const c=x=>Math.round(x*G.discount);
    const wc=c(450*(G.weaponLvl+1)), fc=c(500+G.extraFlasks*250);
    const n={who:'Dvalin',text:G._dvText||'En lille, bred dværg slår gnister af en ambolt, han har slæbt med sig ud i sneen. «Dvalin, smed. Jeg handler med runer, ikke med medlidenhed. Hvad skal det være?»',opts:[]};
    G._dvText=null;
    if(G.weaponLvl<3) n.opts.push({t:`Forstærk mit våben (+15 % skade) · ${wc} runer`,go:()=>{if(P.runes<wc){G._dvText='«Det rækker ikke. Kom igen, når dine lommer klirrer.»';}else{P.runes-=wc;G.weaponLvl++;sfx('block');G._dvText=`Han hamrer runer ind i stålet, til de gløder. «Sådan. Det bider bedre nu.» (Våben +${G.weaponLvl})`;}return D.dvalin();}});
    if(G.extraFlasks<3) n.opts.push({t:`Køb et ekstra mjødhorn · ${fc} runer`,go:()=>{if(P.runes<fc){G._dvText='«Mjød er dyrt i en vinter som denne. Du har ikke nok.»';}else{P.runes-=fc;G.extraFlasks++;P.flasks++;sfx('drink');G._dvText='«Fyldt fra min egen tønde. Drik det ikke på én gang.» (+1 mjødhorn)';}return D.dvalin();}});
    const AW={berserker:'tvilling',skjoldmo:'langsvaerd',volve:'galdrestav'}[P.cls], ac=c(700);
    if(!(G.inv||[]).includes(AW)) n.opts.push({t:`Smed mig et nyt våben: ${ITEMS[AW].name} · ${ac} runer`,go:()=>{if(P.runes<ac){G._dvText='«Godt stål koster. Kom igen med flere runer.»';}else{P.runes-=ac;G._dvText=`Dvalin arbejder hele natten. Om morgenen ligger ${ITEMS[AW].name.toLowerCase()} på ambolten. «Prøv dem. Du kan altid skifte tilbage.» (Udstyr: ${actLabel('inv')})`;giveItem(AW);}return D.dvalin();}});
    const tc=c(900);
    if(!(G.inv||[]).includes('fenrir')) n.opts.push({t:`Køb Fenrirs tand (+15 % skade, −10 % liv) · ${tc} runer`,go:()=>{if(P.runes<tc){G._dvText='«Den tand har kostet bedre folk end dig en hånd. Kom med flere runer.»';}else{P.runes-=tc;G._dvText='«Bær den med respekt. Ulven glemmer ikke.»';giveItem('fenrir');}return D.dvalin();}});
    if(!f.haggled) n.opts.push({t:'Du tager vel ikke fuld pris af en, der skal redde din hals?',stat:'kar',dc:12,ok:()=>{f.haggled=true;G.discount=.75;G._dvText='Dvalin grynter og tørrer hænderne i forklædet. «Hmpf. Du minder mig om min bror. Tre fjerdedele af prisen, så. Sig det ikke til nogen.»';return D.dvalin();},fail:()=>{f.haggled=true;G._dvText='«Prisen er prisen. Min hals er dværgestærk.»';return D.dvalin();}});
    if(!f.q_durin) n.opts.push({t:'Du ser bekymret ud, smed.',go:()=>{questStart('q_durin','Dvalins bror');note('durin0','Dvalins bror Durin gik ned i Hrafnkels høj for mange vintre siden.');G._dvText='Dvalin holder op med at hamre. «Min bror Durin gik ned i Hrafnkels høj for mange vintre siden. Han ville hente jarlens guld. Han kom aldrig op igen. Hvis du nogensinde kommer derned…» Han ser væk.';return D.dvalin();}});
    if(f.hammer&&!f.durinDone){
      n.opts.push({t:'Jeg fandt Durin. Draugr tog ham i mørket. Her er hans hammer.',go:()=>{f.durinDone=true;f.durinChoice='truth';G.weaponLvl=Math.min(4,G.weaponLvl+1);approve(1);sfx('block');
        G._dvText=`Dvalin vender hammeren i hænderne. «Så ved jeg det.» Han går til ambolten og smeder et stykke af hammerens hoved ind i dit våben, uden et ord. (Våben +${G.weaponLvl})`;return D.dvalin();}});
      n.opts.push({t:'Han døde som en helt. Han tog tre draugr med sig.',stat:'kar',dc:14,ok:()=>{f.durinDone=true;f.durinChoice='lie';G.discount=.5;P.runes+=400;approve(1);sfx('coins');
        G._dvText='Dvalins øjne bliver blanke. «Tre! Det lyder som ham.» Han trykker 400 runer i din hånd. «Halv pris for dig, resten af mine dage.»';return D.dvalin();},
        fail:()=>{f.durinDone=true;f.durinChoice='lie';approve(-1);G._dvText='Dvalin ser længe på dig. «Du lyver dårligt. Men tak, fordi du prøvede.» Han tager hammeren og vender dig ryggen.';return D.dvalin();}});
    }
    n.opts.push({t:'Farvel.'});
    return n;
  },
  astrid(){
    const f=F();
    if(f.astridLeft) return{who:'Astrid',text:'«Vi to er færdige med hinanden. Find en anden at slæbe rundt på.»',opts:[{t:'Farvel.'}]};
    const join=t=>{makeCompanion('astrid');f.astrid=true;setTimeout(()=>{questStart('q_astrid','Jarnsdóttirs hævn');note('astrid','Astrids far blev dræbt af en rimtrold i skoven nordøst for porten. Hun vil være der, når den falder.');},4000);
      return{who:'Astrid',text:t+' Astrid slutter sig til dig. Når hun er med, slår du med fordel på Karisma-slag. Hun holder øje med, hvordan du behandler folk.',opts:[{t:'Så går vi.'}]};};
    const n={who:'Astrid Jarnsdóttir',text:f.metAstrid?'«Stadig i live? Det er mere, end de fleste kan sige.»':'En kvinde med bue og fletninger stivnet af rim sidder ved et ulmende bål og skærer pile. «Astrid Jarnsdóttir. Jeg jager draugr for sølv. Du ligner en, der snart selv bliver én.»',opts:[]};
    f.metAstrid=true;
    if(f.astrid&&(!C||C.kind!=='astrid')){n.opts.unshift({t:'Kom med mig igen.',go:()=>{makeCompanion('astrid');return{who:'Astrid',text:'Hun slynger buen over skulderen. «Det tog dig længe nok.»',opts:[{t:'Så går vi.'}]};}});n.opts.push({t:'Farvel.'});return n;}
    if(f.jarlDead) n.opts.push({t:'Hrafnkel er død. Her er hans horn.',tag:'spc',tagT:'BEDRIFT',go:()=>join('Hun rejser sig og vejer hornet i hånden. «Du fældede jarlen? Så har jeg vist undervurderet dig.»')});
    if(!f.aTriedKar) n.opts.push({t:'Alene dør du derude. Sammen har vi en chance mod Rimtursen.',stat:'kar',dc:13,ok:()=>join('Hun ser ind i ilden, så på dig. «Pæne ord. Og sande, desværre.»'),fail:()=>{f.aTriedKar=true;return{who:'Astrid',text:'«Pæne ord. Kom tilbage, når du har fældet noget større end en ulv.»',opts:D.astrid().opts};}});
    if(!f.aTriedSty) n.opts.push({t:'Lad os armlægge om det. Vinder jeg, følger du mig.',stat:'sty',dc:14,ok:()=>join('Hendes arm giver efter med et knæk. «Fint! Fint. Jeg følger dig, kæmpe.»'),fail:()=>{f.aTriedSty=true;return{who:'Astrid',text:'Du ligger på ryggen i sneen, før du når at spænde armen. «Træn lidt mere.»',opts:D.astrid().opts};}});
    if(P.runes>=150) n.opts.push({t:'Jeg betaler. 150 runer for din bue.',go:()=>{P.runes-=150;return join('Hun bider i en af runerne. «Ægte nok. Du har købt dig en bue.»');}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  thorgrim(){
    const f=F(); const reward=f.lindormAdvance?550:800;
    if(f.lindormDead&&!f.lindormPaid){f.lindormPaid=true;P.runes+=reward;setTimeout(()=>giveItem('lindskael'),600);sfx('coins');
      return{who:'Jarl Thorgrim',text:`Thorgrim rejser sig, før du når at sige noget. «Jægerne så den falde fra hinanden på isen. Det her er dit.» Han lægger ${reward} runer i din hånd og et skjold af grønsort skæl over din skulder. «Lindormskæl. Smedet af dens egen hud. Ingen i Ravnsholm glemmer dette.»`,opts:[{t:'Tak, jarl.'}]};}
    if(f.lindormPaid) return{who:'Jarl Thorgrim',text:'«Skjaldene synger allerede om dig. Gå med Odin, lindormsbane.»',opts:[{t:'Farvel.'}]};
    const n={who:'Jarl Thorgrim',text:f.thorgrimMet?(f.lindormQuest?'«Ligger lindormen stadig på søen? Mine folk tør ikke gå ud på isen.»':'«Har du tænkt over mit tilbud?»'):'En bredskuldret mand med pelskappe og en sølvring om overarmen ser op fra et kort over fjorden. «Jarl Thorgrim af Ravnsholm. Du er den, Ulfr taler om. Godt. Jeg har brug for en, der ikke er bange for at dø.»',opts:[]};
    f.thorgrimMet=true;
    if(!f.lindormQuest) n.opts.push({t:'Hvad har du brug for?',go:()=>{f.lindormQuest=true;return{who:'Jarl Thorgrim',text:'«En lindorm er kravlet op fra Isfjorden og har lagt sig på den frosne sø mod øst, bag Mimirs sten. Den har taget vores rener og to af mine jægere. Dræb den, og du får 800 runer og et skæl af dens egen hud at bære.»',opts:D.thorgrim().opts};}});
    if(f.lindormQuest&&!f.thorgrimKar) n.opts.push({t:'Betal halvdelen nu, så jeg kan købe mjød til turen.',stat:'kar',dc:14,ok:()=>{f.thorgrimKar=true;f.lindormAdvance=true;P.runes+=250;sfx('coins');return{who:'Jarl Thorgrim',text:'Thorgrim griner kort. «Du har en tunge som en skjald. 250 nu, resten når jeg ser dens hoved.»',opts:D.thorgrim().opts};},fail:()=>{f.thorgrimKar=true;return{who:'Jarl Thorgrim',text:'«Jeg betaler for et lig, ikke for løfter.»',opts:D.thorgrim().opts};}});
    if(f.lindormQuest&&!f.thorgrimVil) n.opts.push({t:'Hvad så dine jægere, før de døde?',stat:'vil',dc:12,ok:()=>{f.thorgrimVil=true;note('lindorm','Lindormen skriger, før den kaster sig frem i en lige linje. Rul til siden. Når den bløder, vågner ynglen.');return{who:'Jarl Thorgrim',text:'Han tøver. «Den eneste, der kom tilbage, sagde, at den skriger, før den kaster sig frem i en lige linje. Rul til siden, ikke bagud. Og når den bløder, vågner ynglen i isen.»',opts:D.thorgrim().opts};},fail:()=>{f.thorgrimVil=true;return{who:'Jarl Thorgrim',text:'«De så den. Så døde de. Mere ved jeg ikke.»',opts:D.thorgrim().opts};}});
    if(f.thorgrimMet&&!f.q_bjorn) n.opts.push({t:'Er der andet, der tynger dig?',go:()=>{questStart('q_bjorn','Den forsvundne jæger');return{who:'Jarl Thorgrim',text:'«Min jæger Bjørn gik mod sydøst efter rener for fire dage siden. Han kom aldrig hjem. Skoven derovre kryber med trolde. Find ham, levende eller død.»',opts:D.thorgrim().opts};}});
    if(f.bjornDone&&!f.bjornPaid) n.opts.push({t:'Jeg fandt Bjørn.',go:()=>{f.bjornPaid=true;const saved=f.bjornChoice==='saved';if(saved){P.runes+=400;sfx('coins');}
      return{who:'Jarl Thorgrim',text:saved?'«Han kom slæbende ind ad porten i morges, bleg som sne, men levende. Han siger, at du forbandt ham.» Thorgrim lægger 400 runer på bordet.':'Thorgrim sænker hovedet. «Så har skoven taget endnu en. Tak, fordi du fortæller mig det.»',opts:D.thorgrim().opts};}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  eir(){
    const f=F(); const first=!f.metEir; f.metEir=true;
    const join=t=>{makeCompanion('eir');return{who:'Eir',text:t+' Eir slutter sig til dig. Hun heler dig, når du er hårdt såret, og giver dig fordel på Vilje-slag.',opts:[{t:'Så går vi.'}]};};
    const swap=C&&C.kind==='astrid'?' Astrid vender tilbage til lejren og venter der.':'';
    const n={who:'Eir, helbrederske',text:first?'En kvinde i hvid kappe knuser urter i en morter ved brønden. «Eir. Jeg heler dem, der kan heles. For resten synger jeg.»':'Eir ser op fra morteren. «Blødende igen?»',opts:[]};
    if(!f.eirHealed) n.opts.push({t:'Kan du hele mine sår?',go:()=>{f.eirHealed=true;P.hp=maxHp();P.hpLag=P.hp;sfx('rune');return{who:'Eir',text:'Hun lægger en varm hånd på dit bryst og nynner en gammel galdr. Smerten trækker sig tilbage som tidevand. «Én gang. Mine urter vokser ikke i sne.» (Fuldt liv)',opts:D.eir().opts};}});
    if(f.bjornChoice==='saved') n.opts.push({t:'Følg med mig. Jeg kunne bruge en helbreder.',tag:'spc',tagT:'BJØRN LEVER',go:()=>join('«Du forbandt Bjørn, da du kunne have taget hans pung. Det siger nok.»'+swap)});
    else if(!f.eirTried) n.opts.push({t:'Jeg har set nok død. Hjælp mig med at standse den.',stat:'vil',dc:12,ok:()=>join('Hun ser længe på dig. «Det mener du. Godt.»'+swap),fail:()=>{f.eirTried=true;return{who:'Eir',text:'«Ord er billige. Vis mig, at du hjælper folk, så taler vi igen.»',opts:D.eir().opts};}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  bjorn(){
    const f=F(); f.bjornFound=true;
    const done=(choice,text,appr)=>{f.bjornDone=true;f.bjornChoice=choice;if(appr)approve(appr);return{who:'Bjørn',text,opts:[{t:'Gå.'}]};};
    return{who:'Bjørn, såret jæger',text:'En mand ligger op ad en sten med en brækket spydstage i hånden. Sneen omkring ham er rød. «Trolde… tre af dem. Jeg kan ikke gå. Hvis du har en kniv, så gør det hurtigt, eller hjælp mig.»',opts:[
      {t:'Lad mig se på såret.',stat:'vil',dc:11,ok:()=>done('saved','Du presser sne ind i såret og binder det med din egen kappestrimmel. Farven vender tilbage i hans ansigt. «Jeg når hjem. Sig til jarlen, at Bjørn ikke er død endnu.»',1),
        fail:()=>done('died','Du gør, hvad du kan, men blodet bliver ved med at komme. Han griber din hånd. «Sig til Thorgrim, at jeg prøvede.» Så ligger han stille.',0)},
      {t:'Din pung har du alligevel ikke brug for.',go:()=>{P.runes+=150;sfx('coins');return done('robbed','Du tager hans pung. Han ser på dig, så lukker han øjnene. Du får 150 runer.',-2);}},
      {t:'Jeg kommer tilbage.'}]};
  },
  mimir(){
    const f=F();
    if(f.mimir) return {who:'Mimirs Hoved',text:'«Jeg har sagt, hvad jeg ville sige. Husk navnet: Sigrun.»',opts:[{t:'Farvel.'}]};
    if(f.mimirFailed) return {who:'Mimirs Hoved',text:'Øjnene er lukkede nu. Vandet omkring hovedet er frosset til.',opts:[{t:'Gå.'}]};
    return {who:'Mimirs Hoved',text:'Et afhugget hoved hviler på en sten midt på isen. Vandet omkring det fryser ikke. Øjnene åbner sig. «Odin betalte med et øje for at drikke af min brønd. Hvad vil du betale, lille ravnebærer?»',opts:[
      {t:'Stil mig en gåde. Svarer jeg rigtigt, giver du mig din visdom.',go:()=>({who:'Mimirs Hoved',text:'«Jeg har ingen mund, men svarer, når du råber. Jeg har ingen krop, men bor i bjerget. Hvad er jeg?»',opts:[
        {t:'Ekko.',go:mimirWin},{t:'Ravnen.',go:mimirLose},{t:'Vinden.',go:mimirLose},
        {t:'Lyt efter svaret i isen.',stat:'vil',dc:14,ok:()=>{const n=mimirWin();n.text='Du lukker øjnene. Dit eget hvisken kommer tilbage fra fjeldet, svagt og forsinket. «Ekko,» siger du. '+n.text;return n;},fail:mimirLose}]})},
      {t:'Intet. Farvel.'}]};
  },
  gate(){
    const f=F();
    if(f.horn) return {who:'Jötunporten',text:'To døre af sort jern og is, højere end tre mænd. I midten sidder en fordybning formet som et horn.',opts:[{t:'Blæs i Jarlens Horn.',tag:'spc',tagT:'JARLENS HORN',go:()=>{openGate('Lyden ruller ud over isen. Runerne i søjlerne lyser op, og portens døre glider langsomt op.');return null;}},{t:'Ikke endnu.'}]};
    return {who:'Jötunporten',text:'To døre af sort jern og is, højere end tre mænd. De rokker sig ikke. I midten sidder en fordybning formet som et horn.',opts:[
      {t:'Sæt skulderen mod porten og bryd den op.',stat:'sty',dc:19,ok:()=>{f.gateForced=true;openGate('Isen knager, så brister den. Med et brøl presser du dørene fra hinanden.');return null;},fail:()=>{P.hp=Math.max(1,P.hp-18);num(P.x,P.y,18,'hurt');return{who:'Jötunporten',text:'Kulden bider sig fast i dine hænder. Porten rokker sig ikke, og du mister huden på knoerne. (−18 liv)',opts:[{t:'Gå.'}]};}},
      {t:'Gå.'}]};
  },
  jotun(){
    const f=F(); f.jotunTalked=true;
    const opener=f.gateForced?'«DU BRØD MIN PORT, LILLE MENNESKE. SÅ BRYDER JEG DIG.»':'«LILLE MENNESKE. DU BÆRER JARLENS HORN. HRAFNKEL FIK FRED. DET FÅR DU IKKE.»';
    const n={who:'Hrimgrimr, Rimtursen',text:'Jorden ryster. En kæmpe af blåt is rejser sig fra tronen, og frost driver fra hans skæg som røg. '+opener,opts:[]};
    if(f.mimir) n.opts.push({t:'Sigrun ville ikke have ønsket dette, Hrimgrimr.',tag:'spc',tagT:'MIMIRS VISDOM',go:peaceEnd});
    n.opts.push({t:'Vinteren dræber også dine egne. Lad den slutte nu.',stat:'kar',dc:20,ok:peaceEnd,fail:()=>{f.enraged=true;const j=jotunEnt();if(j)j.dmgMult=1.2;return{who:'Hrimgrimr, Rimtursen',text:'«NOK ORD!» Isen omkring ham flammer op i blåt lys. Han er rasende nu.',opts:[{t:'Kæmp.',go:startJotun}]};}});
    n.opts.push({t:'Jeg er kommet efter dit hoved.',tag:'sty',tagT:'KÆMP',go:startJotun});
    return n;
  },
};
function ulfrHub(text){
  const f=F();
  const n={who:'Gamle Ulfr',text,opts:[]};
  if(!f.ulfrWhy) n.opts.push({t:'Hvorfor skulle jeg hjælpe jer?',go:()=>{f.ulfrWhy=true;return ulfrHub('«Fordi du ellers fryser ihjel sammen med os andre. Og fordi de faldnes runer gør dig stærkere. Bær dem til en runesten og hvil. Men husk: dør du, ligger dine runer, hvor du faldt.»');}});
  if(!f.ulfrCheck) n.opts.push({t:'Du skjuler noget, gamle mand.',stat:'vil',dc:10,ok:()=>{f.ulfrCheck=true;f.ulfrGift=true;P.flasks++;questStart('q_ulfr','En faders sorg');note('ulfr','Draugr-jarlen Hrafnkel var engang Gamle Ulfrs søn.');return ulfrHub('Ulfr sænker blikket. «Hrafnkel… draugr-jarlen var engang min søn. Tag mit eget horn, og giv ham fred.» Du får et ekstra mjødhorn.');},fail:()=>{f.ulfrCheck=true;return ulfrHub('«Jeg skjuler intet andet end gigt i knæene.» Han vender sig mod ilden.');}});
  if(f.ring&&!f.ulfrDone){
    n.opts.push({t:'Jeg fandt denne ring på Hrafnkel. Den er din.',go:()=>{f.ulfrDone=true;f.ulfrChoice='give';f.q_ulfr=true;P.runes+=300;sfx('coins');approve(2);
      return ulfrHub('Ulfr tager ringen med begge hænder og presser den mod panden. Længe siger han ingenting. «Hans mor gav ham den. Tak.» Han trykker en pung med 300 runer i din hånd.');}});
    n.opts.push({t:'Han døde som en kriger. Der var intet at finde.',stat:'kar',dc:13,ok:()=>{f.ulfrDone=true;f.ulfrChoice='kept';f.q_ulfr=true;approve(-1);setTimeout(()=>giveItem('hrafnring'),500);
      return ulfrHub('Ulfr nikker langsomt. «Som en kriger. Godt.» Ringen ligger kold i din lomme.');},
      fail:()=>{f.ulfrDone=true;f.ulfrChoice='kept';f.q_ulfr=true;approve(-2);setTimeout(()=>giveItem('hrafnring'),500);
      return ulfrHub('Ulfrs blik falder på sølvet om din finger. Han siger intet. Han vender sig bare mod ilden og bliver der.');}});
  }
  if(!f.ulfrLore) n.opts.push({t:'Hvad ved du om Mimirs Hoved?',go:()=>{f.ulfrLore=true;return ulfrHub('«Den frosne sø mod øst. Hovedet af Odins gamle rådgiver hviler der. Det taler i gåder. Svar rigtigt, og det fortæller dig ting, selv guderne har glemt.»');}});
  n.opts.push({t:f.horn?'Jeg går nordpå.':'Jeg finder hornet.'});
  return n;
}
function mimirWin(){F().mimir=true;sfx('rune');note('sigrun','Mimir: Rimtursen var engang Hrimgrimr Ymirsson. Han elskede en menneskekvinde ved navn Sigrun.');return{who:'Mimirs Hoved',text:'«Klogt. Hør da: Rimtursen var engang Hrimgrimr Ymirsson, og han elskede en menneskekvinde ved navn Sigrun. Hun døde i den første vinter, og siden har han villet, at alle skulle fryse som hun. Nævn hende, og han husker, hvem han var.» Du har fået Mimirs Visdom: +2 på alle terningeslag.',opts:[{t:'Tak, vise hoved.'}]};}
function mimirLose(){const f=F();f.mimirFailed=true;setTimeout(()=>{for(let i=0;i<3;i++){const a=i*2.1;spawnEnemy('wolf',2850+Math.cos(a)*240,1400+Math.sin(a)*180,{aggro:true});}sfx('howl');},400);return{who:'Mimirs Hoved',text:'«Forkert.» Øjnene lukker sig. Isen sprækker under dig, og ulve hyler i tågen.',opts:[{t:'Træk våbnet.'}]};}
function jotunEnt(){return G.enemies.find(e=>e.boss==='jotun'&&!e.dead);}
function startJotun(){const j=jotunEnt();if(j){j.dormant=false;j.aggro=true;G.boss=j;}banner('Hrimgrimr, Rimtursen','','frost');return null;}
function peaceEnd(){G.flags.jotunDone=true;G.flags.peace=true;G.ending='word';const j=jotunEnt();if(j){j.leaving=true;}G.endT=6.5;sfx('ok');
  return{who:'Hrimgrimr',text:'Kæmpen står længe stille. Så knæler han, og isen i hans skæg begynder at dryppe. «Sigrun…» Han rejser sig, vender ryggen til dig og går ind i tågen mod nord. Bag dig synger en fugl for første gang i tre år.',opts:[{t:'Se ham gå.'}]};}
function openGate(text){G.flags.gateOpen=true;GATE.gone=true;G.gateAnim=0;sfx('horn');setTimeout(()=>sfx('gate'),900);G.shake=.5;toast(text);banner('JÖTUNPORTEN ER ÅBEN','');saveGame();}

const dlgEl=$('dlg'), dlgOpts=$('dlgOpts');
let dlgCur=null, dlgNPC=null;
function talk(id){
  const node=D[id](); if(!node) return;
  dlgNPC=NPCS.find(n=>n.id===id)||(id==='gate'?{x:1800,y:WALL_Y+20,gate:true}:id==='jotun'?jotunEnt():null);
  if(dlgNPC&&!dlgNPC.gate){P.face=Math.atan2(dlgNPC.y-P.y,dlgNPC.x-P.x);}
  G.state='dialog';$('letterbox').classList.add('on');$('hud').style.opacity=0;mouse.l=mouse.r=false;buf=null;
  showNode(node);
}
function showNode(n){
  if(!n){closeDialog();return;}
  sfx('page');
  dlgCur=n;dlgEl.hidden=false;$('dlgWho').textContent=n.who;$('dlgText').textContent=n.text;dlgOpts.innerHTML='';
  (n.opts&&n.opts.length?n.opts:[{t:'Farvel.'}]).forEach((o,i)=>{
    const li=document.createElement('li');const b=document.createElement('button');b.className='opt';b.type='button';
    let tag='';if(o.stat){tag=`<span class="tag ${o.stat}">[${STATN[o.stat][1].toUpperCase()}]</span>`;}else if(o.tagT){tag=`<span class="tag ${o.tag||''}">[${o.tagT}]</span>`;}
    const dc=o.stat?`<span class="dc">SV ${o.dc}${hasAdv(o.stat)?' · fordel':''}</span>`:'';
    b.innerHTML=`<span class="n">${i+1}.</span><span>${tag} ${escapeHtml(o.t)}</span>${dc}`;
    b.addEventListener('click',()=>choose(o));li.appendChild(b);dlgOpts.appendChild(li);
  });
  setTimeout(()=>dlgOpts.querySelector('button')?.focus({preventScroll:true}),30);
}
function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function choose(o){
  if(G.state!=='dialog') return;
  if(o.stat){dlgEl.hidden=true;rollCheck(o.stat,o.dc,ok=>{const nx=ok?o.ok():o.fail();showNode(nx);});}
  else showNode(o.go?o.go():null);
}
function closeDialog(){dlgEl.hidden=true;$('letterbox').classList.remove('on');$('hud').style.opacity=1;dlgCur=null;dlgNPC=null;if(G.state==='dialog')G.state='play';saveGame();}

// --- 3D d20
const diceR=new THREE.WebGLRenderer({canvas:$('diceCv'),antialias:true,alpha:true});diceR.setPixelRatio(Math.min(devicePixelRatio,2));diceR.setSize(260,260,false);
diceR.toneMapping=THREE.ACESFilmicToneMapping;
const dScene=new THREE.Scene(), dCam=new THREE.PerspectiveCamera(32,1,.1,50); dCam.position.set(0,0,6.4);
dScene.environment=scene.environment;
dScene.add(new THREE.AmbientLight(0x404858,1.2));const dl1=new THREE.DirectionalLight(0xfff0d0,3);dl1.position.set(3,4,5);dScene.add(dl1);const dl2=new THREE.PointLight(0x7fd6ff,30,20);dl2.position.set(-3,-2,3);dScene.add(dl2);
const d20=new THREE.Mesh(new THREE.IcosahedronGeometry(1.35,0),new THREE.MeshStandardMaterial({color:0x2a1d0e,metalness:.9,roughness:.28,flatShading:true,emissive:0x1a0f04}));
d20.add(new THREE.LineSegments(new THREE.EdgesGeometry(d20.geometry),new THREE.LineBasicMaterial({color:0xf3d68a})));dScene.add(d20);
let diceAnim=null;
function rollCheck(stat,dc,cb){
  const adv=hasAdv(stat);
  const r1=1+Math.floor(Math.random()*20), r2=adv?1+Math.floor(Math.random()*20):0, nat=adv?Math.max(r1,r2):r1;
  const sm=mod(P.stats[stat]), prof=2, mim=G.flags.mimir?2:0, total=nat+sm+prof+mim;
  const ok=nat===20||(nat!==1&&total>=dc);
  $('dice').hidden=false;$('diceHead').textContent=`${STATN[stat][1].toUpperCase()} · SVÆRHEDSGRAD`;$('diceDC').textContent=dc;
  $('diceRes').textContent='';$('diceRes').className='';$('diceInfo').textContent=adv?compName()+' er med dig: du slår med fordel':'';$('dieN').style.opacity=0;$('diceGo').hidden=true;
  diceAnim={stat,t:0,dur:1.5,vx:rand(8,12),vy:rand(8,12),vz:rand(4,8),done:false,cb,ok,nat,r1,r2,adv,sm,prof,mim,total,dc,tick:0};
  d20.material.emissive.setHex(0x1a0f04);
  $('diceGo').onclick=()=>{$('dice').hidden=true;const a=diceAnim;diceAnim=null;a.cb(a.ok);};
}
function updDice(dt){
  if(!diceAnim) return; const a=diceAnim; a.t+=dt; const k=clamp(a.t/a.dur,0,1), sp=Math.pow(1-k,2.2);
  d20.rotation.x+=a.vx*sp*dt;d20.rotation.y+=a.vy*sp*dt;d20.rotation.z+=a.vz*sp*dt;
  d20.position.y=Math.abs(Math.sin(k*Math.PI*3))*(1-k)*.5;
  a.tick-=dt; if(k<1&&a.tick<=0){a.tick=.06+k*.12;sfx('tick');$('dieN').style.opacity=.5;$('dieN').textContent=1+Math.floor(Math.random()*20);}
  if(k>=1&&!a.done){a.done=true;$('dieN').textContent=a.nat;$('dieN').style.opacity=1;
    const parts=[(a.adv?`Slag ${a.r1} og ${a.r2}, bedste ${a.nat}`:`Slag ${a.nat}`),`${STATN[a.stat][0]} ${fmtMod(a.sm)}`,`Færdighed +${a.prof}`];
    if(a.mim)parts.push('Mimir +2');
    $('diceInfo').textContent=parts.join(' · ')+` = ${a.total}`;
    const R=$('diceRes');R.textContent=a.nat===20?'KRITISK SUCCES':a.nat===1?'KRITISK FIASKO':a.ok?'SUCCES':'FIASKO';R.className=a.ok?'ok':'no';
    d20.material.emissive.setHex(a.ok?0x6a4a10:0x4a0806);sfx(a.ok?'ok':'no');$('diceGo').hidden=false;$('diceGo').focus({preventScroll:true});}
  diceR.render(dScene,dCam);
}

/** Astrid gives advantage on Charisma checks, Eir on Willpower checks. */
function hasAdv(stat){return !!(C&&!C.down&&((stat==='kar'&&C.kind==='astrid')||(stat==='vil'&&C.kind==='eir')));}
