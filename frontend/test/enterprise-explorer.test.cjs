const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
const Explorer=require('../src/components/EnterpriseExplorer.tsx').default;
const organizations=[{id:'org1',name:'Factory Group',code:'ORG1',industryType:'AUTOMOTIVE',isActive:false}];
const plants=[{id:'plant1',name:'Assigned Plant',code:'P1',organizationId:'org1',status:'ACTIVE'}, {id:'plant2',name:'Orphan Plant',code:'P2',organizationId:'missing',status:'INACTIVE'}];
const render=(selection,overrides={})=>renderToStaticMarkup(React.createElement(Explorer,{organizations,plants,selection,onSelect(){},onAddOrganization(){},onEditOrganization(){},onAddPlant(){},onEditPlant(){},onTheme(){},...overrides}));
test('tree exposes both assigned and orphan plants with accessible hierarchy',()=>{
 const html=render(null);assert.match(html,/Unassigned organization/);assert.match(html,/Assigned Plant/);assert.match(html,/Orphan Plant/);assert.match(html,/role="tree"/);assert.equal((html.match(/role="treeitem"/g)||[]).length,4);assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
});
test('organization detail preserves inactive state and only lists its own plant',()=>{
 const html=render({kind:'organization',id:'org1'}).split('aria-label="Selected item details"')[1];assert.match(html,/>Inactive</);assert.match(html,/Assigned Plant/);assert.doesNotMatch(html,/Orphan Plant/);assert.match(html,/Add plant to/);
});
test('plant details identify missing parent and do not fabricate defaults',()=>{
 const html=render({kind:'plant',id:'plant2'}).split('aria-label="Selected item details"')[1];assert.match(html,/Unassigned organization/);assert.match(html,/Not configured/);assert.match(html,/Not specified/);assert.match(html,/Customize Theme/);assert.doesNotMatch(html,/Asia\/Kolkata/);
});

const Actions=require('../src/components/EnterpriseActions.tsx').default;
test('inline actions target the named item and isolate click and keyboard events',()=>{
 const called=[];const item={id:'p1',name:'Plant one'};
 const element=Actions({kind:'plant',item,onEdit:()=>called.push('edit'),onAdd:()=>called.push('sibling'),onArchive:target=>called.push(target)});
 let stopped=0;element.props.onClick({stopPropagation:()=>stopped++});element.props.onKeyDown({stopPropagation:()=>stopped++});
 for(const button of element.props.children)button.props.onClick();
 assert.equal(stopped,2);assert.deepEqual(called,['edit','sibling',{kind:'plant',...item,restore:false}]);
});
test('archived nodes are hidden by default and become restorable in archived view',()=>{
 const archived=[{...organizations[0],archivedAt:'2026-10-18'}];
 assert.doesNotMatch(render(null,{organizations:archived}),/Assigned Plant/);
 const html=render({kind:'organization',id:'org1'},{organizations:archived,showArchived:true});
 assert.match(html,/Restore organization: Factory Group/);assert.doesNotMatch(html,/Edit organization: Factory Group/);
 assert.doesNotMatch(html,/Edit plant: Assigned Plant/);
});
test('a plant under an archived parent cannot be restored or edited independently',()=>{
 const element=Actions({kind:'plant',item:{id:'p',name:'P',archivedAt:'2026-10-18'},inheritedArchived:true,onEdit(){},onAdd(){},onArchive(){}});
 assert.equal(element.props.children.length,0);
});
