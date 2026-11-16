import {learnArticles} from '../../../../lib/learn';
import {supportedLocales,pathFor} from '../../../../lib/catalog';
import type {Locale} from '../../../../lib/i18n';
import {allowedPath,serializeLearnArticleMarkdown,origin} from '../../../../lib/feed-parity';
export function getStaticPaths(){return supportedLocales.filter(l=>l!=='en').flatMap(locale=>learnArticles.filter(a=>allowedPath(pathFor(locale,`/learn/${a.slug}`))).map(article=>({params:{locale,slug:article.slug},props:{article,locale}})));}
export function GET({props}:{props:{article:typeof learnArticles[number];locale:Locale}}){const text=serializeLearnArticleMarkdown(props.article).replace(`- Canonical: ${origin}/learn/${props.article.slug}`,`- Canonical: ${origin}${pathFor(props.locale,`/learn/${props.article.slug}`)}`);return new Response(text,{headers:{'Content-Type':'text/markdown; charset=utf-8'}});}
