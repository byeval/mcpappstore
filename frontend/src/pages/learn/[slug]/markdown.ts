import {learnArticles} from '../../../lib/learn';
import {allowedPath,serializeLearnArticleMarkdown} from '../../../lib/feed-parity';
export function getStaticPaths(){return learnArticles.filter(a=>allowedPath(`/learn/${a.slug}`)).map(article=>({params:{slug:article.slug},props:{article}}));}
export function GET({props}:{props:{article:typeof learnArticles[number]}}){return new Response(serializeLearnArticleMarkdown(props.article),{headers:{'Content-Type':'text/markdown; charset=utf-8'}});}
