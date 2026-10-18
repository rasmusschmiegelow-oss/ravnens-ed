'use strict';
/* =========================================================
   DIALOGUE + DICE
   ========================================================= */
const F=()=>G.flags;
const D={
  ulfr(){
    const f=F();
    if(f.act2&&!f.surtDone) return ulfrHub(f.metRagna?'«Ragna af Skjoldvik? Hun var ung, da jeg var ung. Hun ser mere i ilden end jeg i ravnene. Lyt til hende.»':'Ulfr står ved runestenen og ser mod øst, hvor himlen er rød. «Vinteren er brudt, men se dér. Røgen. Isen i Askepasset er smeltet, og noget brænder på den anden side. Gå derover, og find Skjoldvik, hvis byen stadig står.»');
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
    for(const [id,price] of [['ild',120],['frost',160]]){const pc=c(price),it=CONS[id];if((G.cons[id]||0)<it.max)n.opts.push({t:`Køb en ${it.name.toLowerCase()} · ${pc} runer`,go:()=>{if(P.runes<pc)G._dvText='«Krukker er ikke gratis.»';else{P.runes-=pc;giveCons(id,1,true);sfx('coins');G._dvText=`«${id==='ild'?'Kast den, før lunten brænder ned.':'Pas på fingrene. Den bider.'}» (${it.name}: ${G.cons[id]})`;}return D.dvalin();}});}
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
    if(f.thorgrimMet&&!f.horse) n.opts.push({t:'Vejene er lange. Har du en hest, jeg kan låne?',go:()=>{f.horse=true;sfx('horn');setTimeout(()=>toast(`Fløjt på Hrimfaxe med ${actLabel('horse')}, når ingen fjender er tæt på.`),600);
      return{who:'Jarl Thorgrim',text:'Thorgrim fløjter, og en grå hest med rim i manken trisser ud af stalden. «Hrimfaxe. Han er hurtigere end ulvene og klogere end de fleste af mine mænd. Fløjt, så kommer han. Men kæmp ikke fra ryggen af ham. Han er en rejsehest, ikke en krigshest.»',opts:D.thorgrim().opts};}});
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
    if(!f.eirSalve) n.opts.push({t:'Har du noget, jeg kan tage med?',go:()=>{f.eirSalve=true;giveCons('salve',2,true);return{who:'Eir',text:'Hun pakker to små krukker ind i et klæde. «Eirs salve. Smør den på, når det gør ondt, ikke når det er for sent.» (Eirs salve ×2, tast 4)',opts:D.eir().opts};}});
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
  ragna(){
    const f=F(), first=!f.metRagna; f.metRagna=true; const lit=Object.keys(f.beacons||{}).length;
    const n={who:'Ragna, völve af Skjoldvik',text:G._rgText||(first?'En gammel kvinde med aske i håret sidder ved bålet og kaster knogler i gløderne. Hun ser ikke op. «Jeg så dig i ilden, før du kom. Ravnebæreren, der brød vinteren. Ved du, hvad du har gjort?»':'Ragna rører i gløderne. «Ilden taler stadig. Hvad vil du vide?»'),opts:[]};
    G._rgText=null;
    if(!f.ragnaWhy) n.opts.push({t:'Hvad mener du? Vinteren er brudt.',go:()=>{f.ragnaWhy=true;
      note('surt','Ragna: Isen holdt Muspelheims ild nede. Nu vågner Surt i revnen bag Flammeporten. Garm, Helhunden, vogter vejen fra hulen Gnipahellir.');
      G._rgText=(f.act1End==='word'?'«Du talte en jötun til fred. Det var smukt, og det var forkert. ':'«Du knuste en jötuns hjerte. Det var modigt, og det var forkert. ')+'Fimbulvinteren var ikke kun Rimtursens ondskab. Isen holdt Muspelheims ild nede. Nu er den brudt, og Surt vågner i revnen bag Flammeporten mod nord. Når han rejser sig helt, brænder Midgard, som det står i spådommen. Vejen til ham vogtes af Garm, Helhunden, i hulen Gnipahellir. Dræb hunden, så slukker runerne på porten.»';return D.ragna();}});
    if(f.ragnaWhy&&!f.q_varder) n.opts.push({t:'Hvordan kan jeg hjælpe Skjoldvik?',go:()=>{questStart('q_varder','Vardernes lys');
      G._rgText='«Tre varder står på højderne omkring fjorden: én mod nordvest, én ved vejen mod Gnipahellir og én mod sydøst. Når de brænder, kan de spredte overlevende finde hjem. Men Surts væsner vogter dem. Tænd dem, og du får det sidste, jeg ejer.»';return D.ragna();}});
    if(f.q_varder&&!f.vardeDone&&lit>=3) n.opts.push({t:'Alle tre varder brænder.',go:()=>{f.vardeDone=true;P.runes+=800;sfx('coins');setTimeout(()=>giveItem('vardeflamme'),500);approve(1);
      G._rgText='Ragna rejser sig for første gang og ser mod højderne, hvor lyset brænder. «De kommer hjem nu. Én efter én.» Hun lægger en glød i en lille jernkapsel og lukker din hånd om den. «Vardeflammen. Den slukker ikke, så længe du lever.» Du får også 800 runer.';return D.ragna();}});
    if(f.ragnaWhy&&(G.cons.salve||0)<3) n.opts.push({t:'Har du helende urter? · 300 runer',go:()=>{if(P.runes<300)G._rgText='«Urter vokser ikke i aske. De koster.»';else{P.runes-=300;giveCons('salve',1,true);sfx('coins');G._rgText='Hun giver dig en krukke salve, der lugter af enebær. (Eirs salve)';}return D.ragna();}});
    if(f.ragnaWhy&&!f.ragnaGarm) n.opts.push({t:'Læs Garms skæbne i knoglerne for mig.',stat:'vil',dc:15,ok:()=>{f.ragnaGarm=true;f.garmLore=true;note('garm','Ragna: Garm bærer et gammelt sår fra lænken Gleipnir. Han tager mere skade, end han lader som om.');
      G._rgText='Knoglerne lægger sig i et mønster, og Ragna nikker langsomt. «Lænken Gleipnir sad om hans hals i tusind år. Såret heler aldrig. Ram ham, og han bløder mere, end han viser.» (Garm tager mere skade)';return D.ragna();},
      fail:()=>{f.ragnaGarm=true;G._rgText='Knoglerne falder i en bunke uden mening. Ragna fejer dem sammen. «Ilden tier i dag.»';return D.ragna();}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  sindri(){
    const f=F(), first=!f.metSindri; f.metSindri=true; const c=x=>Math.round(x*G.discount);
    const hello=f.durinChoice==='truth'?'«Du er den, der bragte Durins hammer hjem til min fætter Dvalin. Han skrev til mig med ravnen. Sindri hedder jeg. Ambolten her er din.»':f.durinChoice==='lie'?'«Dvalin skrev, at hans bror døde som en helt.» Han ser længe på dig. «Det var pænt af dig at sige. Sindri. Smed.»':'«Sindri, smed. Dvalins fætter. Ilden fra revnen er varm nok til at smede alt. Hvad skal det være?»';
    const n={who:'Sindri',text:G._snText||(first?'En dværg med sod i skægget slår på en ambolt af sort sten, og gnisterne er hvide. '+hello:'«Ambolten venter.»'),opts:[]};
    G._snText=null;
    const wc=c(900*Math.max(1,G.weaponLvl-1)), fc=c(1200+Math.max(0,G.extraFlasks-2)*400);
    if(G.weaponLvl<6) n.opts.push({t:`Smed Muspelild ind i mit våben (+15 % skade) · ${wc} runer`,go:()=>{if(P.runes<wc)G._snText='«Muspelild er ikke gratis. Kom med flere runer.»';else{P.runes-=wc;G.weaponLvl++;sfx('block');G._snText=`Han holder dit våben ned i en revne i ambolten, og stålet gløder hvidt. «Nu bider det.» (Våben +${G.weaponLvl})`;}return D.sindri();}});
    if(G.extraFlasks<4) n.opts.push({t:`Køb et ekstra mjødhorn · ${fc} runer`,go:()=>{if(P.runes<fc)G._snText='«Mjød er sjælden i aske. Du har ikke nok.»';else{P.runes-=fc;G.extraFlasks++;P.flasks++;sfx('drink');G._snText='«Det sidste fra Skjoldviks kældre.» (+1 mjødhorn)';}return D.sindri();}});
    for(const [id,price] of [['bjorn',450],['ild',150]]){const pc=c(price),it=CONS[id];if((G.cons[id]||0)<it.max)n.opts.push({t:`Køb ${id==='bjorn'?'et horn':'en'} ${it.name.toLowerCase()} · ${pc} runer`,go:()=>{if(P.runes<pc)G._snText='«Det rækker ikke.»';else{P.runes-=pc;giveCons(id,1,true);sfx('coins');G._snText=`«${id==='bjorn'?'Drik den lige før, ikke efter.':'Kast langt.'}» (${it.name}: ${G.cons[id]})`;}return D.sindri();}});}
    if(!f.q_sindri) n.opts.push({t:'Hvad smeder du helst, hvis du kunne?',go:()=>{questStart('q_sindri','Muspelstenen');note('sindri','Sindri kan smede en brynje, der ikke brænder, hvis han får en Muspelsten. Glødkæmpen ved lavasøen sydøst for Skjoldvik bærer én i brystet.');
      G._snText='«En askebrynje. Brynje, der ikke brænder. Men jeg skal bruge en Muspelsten, og den eneste, jeg kender, sidder i brystet på Glødkæmpen ved lavasøen sydøst for byen. Den vågner, hvis du går for tæt på.»';return D.sindri();}});
    if(f.muspelsten&&!f.sindriDone) n.opts.push({t:'Her er Muspelstenen.',go:()=>{f.sindriDone=true;G.weaponLvl=Math.min(6,G.weaponLvl+1);setTimeout(()=>giveItem('askebrynje'),500);sfx('block');approve(1);
      G._snText=`Sindri vejer stenen i hånden og fløjter. «Den er stadig varm.» Han arbejder hele natten. Om morgenen hænger en brynje af sorte ringe på ambolten, og dit våben gløder svagt. (Askebrynje, våben +${G.weaponLvl})`;return D.sindri();}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  logi(){
    const f=F();
    const n={who:'Logi, Surts herold',text:G._lgText||(f.metLogi?'«Stadig her, lille gnist?»':'En skikkelse af levende ild står midt på vejen. Flammerne former et smilende ansigt. «Logi. Herold for Surt, ilden der var før alt andet. Min herre ved, at du kommer. Han er … nysgerrig. Hvad bringer du ham?»'),opts:[]};
    G._lgText=null; f.metLogi=true;
    const gone=(t)=>{f.logiGone=true;return{who:'Logi',text:t,opts:[{t:'Gå videre.'}]};};
    if(G.inv&&G.inv.includes('hrafnring')&&!f.logiRing) n.opts.push({t:'Tag denne ring. Den er kold som døden.',tag:'spc',tagT:'HRAFNKELS RING',go:()=>{f.logiRing=true;f.surtLore=true;
      G.inv=G.inv.filter(i=>i!=='hrafnring');for(const k in G.eq)if(G.eq[k]==='hrafnring')G.eq[k]=null;P.hp=Math.min(P.hp,maxHp());setTimeout(()=>giveItem('logisglod'),600);
      note('logi','Logi: Surts flamme blafrer, lige efter han har svunget sit sværd. Hans hug rammer også svagere, når han ved, at du kender hans hemmelighed.');
      return gone('Logi holder ringen op mod sine flammer, og den hvæser. «Kulde! Ægte, dødningekold kulde. En sjælden gave i Muspelheim.» Han smiler bredere. «Til gengæld en hemmelighed: Surts flamme blafrer, lige efter han har svunget sit sværd. Og tag den her, før han ser den.» Logi går op i røg og efterlader en glød på vejen.');}});
    if(!f.logiTried) n.opts.push({t:'Selv ild har en svaghed. Hvad er Surts?',stat:'kar',dc:16,ok:()=>{f.logiTried=true;f.surtLore=true;note('logi','Logi: Surts flamme blafrer, lige efter han har svunget sit sværd.');
      return gone('Logi ler, så gnisterne flyver. «Modig gnist! Godt, du har fortjent det: hans flamme blafrer, lige efter han har svunget sit sværd. Lad os se, om du kan bruge det.» Han forsvinder i en hvirvel af aske.');},
      fail:()=>{f.logiTried=true;G._lgText='«Du keder mig, gnist.» Flammerne blafrer utålmodigt.';return D.logi();}});
    n.opts.push({t:'Træd til side, eller jeg slukker dig.',tag:'sty',tagT:'TRUSSEL',go:()=>{f.logiAngry=true;approve(-1);return gone('Logi blusser op i en søjle af ild. «Så skal min herre vide, at du kommer med sværd og ikke med ord.» Han er væk, og luften lugter af svovl. (Surt slår hårdere)');}});
    n.opts.push({t:'Farvel.'});
    return n;
  },
  fgate(){
    const f=F();
    if(f.garmDead) return {who:'Flammeporten',text:'Runerne på de sorte søjler er slukket. Ildtæppet mellem dem blafrer svagt, som om noget holder vejret.',opts:[{t:'Gå gennem ilden.',tag:'spc',tagT:'GARM ER DØD',go:()=>{openFireGate('Ildtæppet skilles for dig som et forhæng. Bag det gløder Muspelrevnen.');return null;}},{t:'Ikke endnu.'}]};
    return {who:'Flammeporten',text:'To søjler af sort glas, og mellem dem et tæppe af flammer, der ikke giver varme, kun smerte. Runerne på søjlerne gløder. Ragna sagde, at de slukker, når Garm er død.',opts:[
      {t:'Læs Surts runer baglæns, og bryd seglet.',stat:'vil',dc:18,ok:()=>{f.fgateForced=true;openFireGate('Runerne flimrer, da du læser dem baglæns, og slukker én efter én. Ildtæppet falder sammen.');return null;},
        fail:()=>{const d=Math.round(maxHp()*.2);P.hp=Math.max(1,P.hp-d);num(P.x,P.y,d,'hurt');return{who:'Flammeporten',text:`Runerne flammer op og brænder sig ind i dine øjne. Du vakler tilbage. (−${d} liv)`,opts:[{t:'Gå.'}]};}},
      {t:'Gå.'}]};
  },
  surt(){
    const f=F(); f.surtTalked=true;
    const past=f.act1End==='word'?'«Du talte Hrimgrimr til fred, hører jeg. Ord. Ord brænder lige så godt som alt andet.»':'«Du knuste Hrimgrimrs hjerte af is. Tak, lille gnist. Uden dig var jeg aldrig vågnet.»';
    const n={who:'Surt, Herre over Muspelheim',text:'Revnen åbner sig, og en kæmpe af sort sten og flammer rejser sig. Hans sværd lyser som en sol. '+past,opts:[]};
    if(f.surtLore) n.opts.push({t:'Jeg ved, hvornår din flamme blafrer.',tag:'spc',tagT:'LOGIS HEMMELIGHED',go:()=>{const s=surtEnt();if(s)s.vuln=1.15;return{who:'Surt',text:'For første gang ser kæmpen usikker ud. «Logi…» Så brøler han, og jorden revner.',opts:[{t:'Kæmp.',go:startSurt}]};}});
    n.opts.push({t:'Ragnarok behøver ikke komme i dag.',stat:'kar',dc:20,ok:()=>{const s=surtEnt();if(s)s.dmgMult=(s.dmgMult||1)*.9;return{who:'Surt',text:'Surt tøver. «Modigt sagt. Men spådommen er ikke min at bryde.» Hans flamme blafrer, før han løfter sværdet. (Surt slår mindre hårdt)',opts:[{t:'Kæmp.',go:startSurt}]};},
      fail:()=>{const s=surtEnt();if(s)s.dmgMult=(s.dmgMult||1)*1.1;return{who:'Surt',text:'«Du taler som en, der allerede brænder.» Flammerne om ham vokser.',opts:[{t:'Kæmp.',go:startSurt}]};}});
    n.opts.push({t:'Midgard brænder ikke i dag.',tag:'sty',tagT:'KÆMP',go:startSurt});
    return n;
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
function surtEnt(){return G.enemies.find(e=>e.boss==='surt'&&!e.dead);}
function startSurt(){const s=surtEnt();if(s){s.dormant=false;s.aggro=true;G.boss=s;}return null;}
function openFireGate(text){G.flags.fgateOpen=true;setFireGate(true,false);sfx('gate');sfx('boom');G.shake=.5;toast(text);banner('FLAMMEPORTEN ER ÅBEN','Muspelrevnen venter','red');saveGame();}
function jotunEnt(){return G.enemies.find(e=>e.boss==='jotun'&&!e.dead);}
function startJotun(){const j=jotunEnt();if(j){j.dormant=false;j.aggro=true;G.boss=j;}banner('Hrimgrimr, Rimtursen','','frost');return null;}
function peaceEnd(){G.flags.jotunDone=true;G.flags.peace=true;G.ending='word';const j=jotunEnt();if(j){j.leaving=true;}G.endT=6.5;sfx('ok');
  return{who:'Hrimgrimr',text:'Kæmpen står længe stille. Så knæler han, og isen i hans skæg begynder at dryppe. «Sigrun…» Han rejser sig, vender ryggen til dig og går ind i tågen mod nord. Bag dig synger en fugl for første gang i tre år.',opts:[{t:'Se ham gå.'}]};}
function openGate(text){G.flags.gateOpen=true;GATE.gone=true;G.gateAnim=0;sfx('horn');setTimeout(()=>sfx('gate'),900);G.shake=.5;toast(text);banner('JÖTUNPORTEN ER ÅBEN','');saveGame();}

const dlgEl=$('dlg'), dlgOpts=$('dlgOpts');
let dlgCur=null, dlgNPC=null;
function talk(id){
  if(P&&P.mount) dismount(false);
  const node=D[id](); if(!node) return;
  dlgNPC=NPCS.find(n=>n.id===id)||(id==='gate'?{x:1800,y:WALL_Y+20,gate:true}:id==='fgate'?{x:5000,y:FWALL_Y+20,gate:true}:id==='jotun'?jotunEnt():id==='surt'?surtEnt():null);
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
