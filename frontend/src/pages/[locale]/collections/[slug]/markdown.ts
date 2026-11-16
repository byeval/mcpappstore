import {appCollections,listCollectionApps} from '../../../../lib/collections';
import {visibleApps,supportedLocales,pathFor} from '../../../../lib/catalog';
import type {CatalogApp} from '../../../../lib/types';
import type {Locale} from '../../../../lib/i18n';
import {allowedPath,serializeCollectionMarkdown,origin} from '../../../../lib/feed-parity';
export function getStaticPaths(){return supportedLocales.filter(l=>l!=='en').flatMap(locale=>appCollections.filter(c=>allowedPath(pathFor(locale,`/collections/${c.slug}`))).map(collection=>({params:{locale,slug:collection.slug},props:{collection,locale}})));}
export function GET({props}:{props:{collection:typeof appCollections[number];locale:Locale}}){const apps=listCollectionApps(props.collection,visibleApps(props.locale) as unknown as CatalogApp[]);const text=serializeCollectionMarkdown(props.collection,apps).replace(`- Canonical: ${origin}/collections/${props.collection.slug}`,`- Canonical: ${origin}${pathFor(props.locale,`/collections/${props.collection.slug}`)}`).replaceAll(`${origin}/app/`,`${origin}${pathFor(props.locale,'/app/')}`);return new Response(text,{headers:{'Content-Type':'text/markdown; charset=utf-8'}});}
