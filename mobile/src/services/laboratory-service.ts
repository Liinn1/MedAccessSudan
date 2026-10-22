import { File } from 'expo-file-system'
import { apiRequest } from '@/api/client'
import type { AuthenticatedUser } from '@/types/auth'

export type LaboratoryOrderStatus = 'requested' | 'sample_collected' | 'in_progress' | 'result_ready'
export type LaboratoryCollectionMethod = 'at_lab' | 'home_collection'
export interface LocalizedOption { id?: number; code?: string; name_en: string; name_ar: string }
export interface LaboratoryProfile { id:number; name:string; address:string; verification_status:string; profile_image_url:string|null; location:LocalizedOption|null; phone:string|null; supports_at_lab:boolean; supports_home_collection:boolean }
export interface LaboratoryOrderItem { id:number; lab_test_id:number; name_en:string; name_ar:string; short_name:string|null; price:string; currency:string; estimated_turnaround_hours:number }
export interface LaboratoryOrder { id:number; reference:string; status:LaboratoryOrderStatus; requested_at:string; collection_method:LaboratoryCollectionMethod; collection_starts_at:string|null; collection:null|{location:LocalizedOption|null;area:string|null;address:string|null;notes:string|null;latitude:number|null;longitude:number|null}; laboratory_name:string; patient?:{id:number;name:string;phone:string|null}; items:LaboratoryOrderItem[]; events?:{id:number;from_status:string|null;to_status:string;created_at:string}[]; result?:{id:number;uploaded_at:string;mime_type:string;original_filename:string;size_bytes:number}|null }
export interface LaboratoryDashboard { user:AuthenticatedUser; profile:LaboratoryProfile; summary:{pending_requests:number;in_progress:number;results_ready:number;tests_offered:number;tests_unavailable:number}; recent_requests:LaboratoryOrder[]; awaiting_results:LaboratoryOrder[] }
export interface LaboratoryOffering { id:number;price:string;currency:string;estimated_turnaround_hours:number;is_available:boolean }
export interface CatalogTest { id:number;name_en:string;name_ar:string;short_name:string|null;specimen_type:string|null;offering:LaboratoryOffering|null }
export interface CatalogGroup extends LocalizedOption { id:number;slug:string;tests:CatalogTest[] }

export async function getLaboratoryDashboard(){return(await apiRequest<{data:LaboratoryDashboard}>('/api/v1/laboratory/dashboard')).data}
export async function getLaboratoryOrders(status:LaboratoryOrderStatus|'all'='all'){const q=status==='all'?'':`?status=${status}`;return(await apiRequest<{data:LaboratoryOrder[]}>(`/api/v1/laboratory/orders${q}`)).data}
export async function getLaboratoryOrder(id:number){return(await apiRequest<{data:LaboratoryOrder}>(`/api/v1/laboratory/orders/${id}`)).data}
export async function transitionLaboratoryOrder(id:number,status:LaboratoryOrderStatus){return(await apiRequest<{data:LaboratoryOrder}>(`/api/v1/laboratory/orders/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})).data}
export async function uploadLaboratoryResult(id:number,uri:string){const file=new File(uri);if(!file.exists||file.size<=0)throw new Error('Selected result is not readable.');const body=new FormData();body.append('result',file);return(await apiRequest<{data:LaboratoryOrder}>(`/api/v1/laboratory/orders/${id}/result`,{method:'POST',body,timeoutMs:30000})).data}
export async function getLaboratoryCatalog(){return(await apiRequest<{data:{categories:LocalizedOption[];groups:CatalogGroup[]}}>('/api/v1/laboratory/catalog')).data}
export async function saveLaboratoryOffering(id:number,input:{price:string;estimated_turnaround_hours:number;is_available:boolean}){return(await apiRequest<{data:LaboratoryOffering}>(`/api/v1/laboratory/offerings/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).data}
export async function getLaboratoryProfile(){return(await apiRequest<{data:{user:AuthenticatedUser;profile:LaboratoryProfile}}>('/api/v1/laboratory/profile')).data}
export async function updateLaboratoryProfile(input:{name:string;phone:string;address:string;location:string;supports_at_lab:boolean;supports_home_collection:boolean}){return(await apiRequest<{data:{user:AuthenticatedUser;profile:LaboratoryProfile}}>('/api/v1/laboratory/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).data}
export async function updateLaboratoryProfilePhoto(uri:string){const file=new File(uri);if(!file.exists||file.size<=0)throw new Error('Selected image is not readable.');const body=new FormData();body.append('profile_photo',file);return(await apiRequest<{data:{profile_image_url:string}}>('/api/v1/laboratory/profile-photo',{method:'POST',body,timeoutMs:30000})).data}
