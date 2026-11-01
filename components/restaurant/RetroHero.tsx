'use client';
import {useId} from 'react';
import styles from './BoutiqueMenu.module.css';

export default function RetroHero({image,title,accent}:{image?:string;title:string;accent:string}){
 const id=useId().replace(/:/g,'');
 const standard=title.length<=18&&accent.length<=20;
 return <section className={styles.retroHero} aria-label={`${title} ${accent}`}>
  {image?<img src={image} alt="" fetchPriority="high"/>:null}
  <h1 className={standard?styles.srOnly:styles.retroCustomTitle}>{title}<br/>{accent}</h1>
  {standard?<svg className={styles.retroLettering} viewBox="0 0 350 220" aria-hidden="true">
   <defs><path id={`${id}-one`} d="M10 83 Q170 57 338 78"/><path id={`${id}-two`} d="M6 145 Q170 119 343 140"/></defs>
   <text><textPath href={`#${id}-one`} textLength="325" lengthAdjust="spacingAndGlyphs">{title}</textPath></text>
   <text><textPath href={`#${id}-two`} textLength="332" lengthAdjust="spacingAndGlyphs">{accent}</textPath></text>
   <path className={styles.retroDoodle} d="M90 192c37-23 73 17 110-5m-37-13c-5-5-20-17-15-23 5-7 14-1 14 5 8-15 26-4 1 18m35 13c9-3 17-9 22-16"/>
  </svg>:null}
 </section>;
}

export function RetroMenuTitle({title}:{title:string}){
 const id=useId().replace(/:/g,'');
 return <><h2 className={styles.srOnly}>{title}</h2><svg className={styles.retroMenuLettering} viewBox="0 0 460 54" aria-hidden="true">
  <defs><path id={`${id}-menu`} d="M43 44 Q230 15 417 44"/></defs>
  <text><textPath href={`#${id}-menu`} textLength="372" lengthAdjust="spacingAndGlyphs">{title}</textPath></text>
  <path className={styles.retroDoodle} d="M24 40c-5-7-18-12-14-20 3-6 11-2 12 4 8-15 20-5 2 16m-18 3-5 3m9-32-5-5m429 31c-5-7-18-12-14-20 3-6 11-2 12 4 8-15 20-5 2 16m13 1 7 3m-9-29 6-5"/>
 </svg></>;
}
