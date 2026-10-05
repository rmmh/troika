import {expect,test} from 'vitest';
import {downloadProgress} from '../src/web/downloadProgress';
function machine(changes:Partial<Record<number,number>>={}) { const cells:Partial<Record<number,number>>={2532:1,2504:3,2511:3,6221:1,6225:200,6216:4000,6217:1000,...changes};return {peek:(a:number)=>cells[a]??0}; }
test('reports actual native software transfer percentage and final publication stage',()=>{
 expect(downloadProgress(machine())).toEqual({label:'Downloading software',percent:25});
 expect(downloadProgress(machine({6217:3999}))).toEqual({label:'Downloading software',percent:99});
 expect(downloadProgress(machine({6217:4000}))).toEqual({label:'Saving and starting software',percent:100});
});
test('connecting and unknown headers never expose stale previous transfer counts',()=>{
 for(const changes of [{2504:1},{2504:2},{6221:0},{6225:404}]) expect(downloadProgress(machine(changes))).toEqual({label:'Connecting to software server'});
});
test('inactive, failed, finished and other applications cannot show a stale download',()=>{
 for(const changes of [{2532:4},{2532:3},{2504:-1},{2504:4},{2504:14},{2511:0},{2511:-1}])expect(downloadProgress(machine(changes))).toBeUndefined();
});
test('file downloads and empty files have honest bounded progress',()=>{
 expect(downloadProgress(machine({2511:2}))).toEqual({label:'Downloading file',percent:25});
 expect(downloadProgress(machine({2511:1,6216:0,6217:0}))).toEqual({label:'Saving file',percent:100});
 expect(downloadProgress(machine({6217:4001}))?.percent).toBe(100);
});
