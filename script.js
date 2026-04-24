
        const { createApp, ref, computed, nextTick, watch, onMounted, onUnmounted } = Vue;
        const apiKey = ""; 

        const fetchGemini = async (payload) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            let retries = 5; let delay = 1000;
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result = await response.json(); return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
                } catch (e) { if (i === retries - 1) throw e; await new Promise(res => setTimeout(res, delay)); delay *= 2; }
            }
        };

        const SeamlessActionItem = {
            props: { itemData: Object, displayText: String, textClass: { type: String, default: 'text-sm font-black text-gray-700 truncate' }, showIcon: { type: Boolean, default: false } }, emits: ['view', 'compare', 'action-click'],
            setup(props, { emit }) {
                const trackRef = ref(null); const isUnlocked = ref(false); const isDragging = ref(false); const dragX = ref(0);
                const maxDrag = 130; const threshold = 80; let startX = 0, startY = 0, longPressTimer = null, isMovedForClick = false;
                const onPointerDown = (e) => { 
                    if (e.pointerType === 'mouse' && e.button !== 0) return; 
                    if (isUnlocked.value) return; 
                    startX = e.clientX; startY = e.clientY; isMovedForClick = false; 
                    longPressTimer = setTimeout(() => { 
                        isUnlocked.value = true; isDragging.value = true; dragX.value = 0; 
                        if (navigator.vibrate) navigator.vibrate(50); longPressTimer = null; 
                    }, 400); 
                };
                const onPointerMove = (e) => { 
                    if (!isUnlocked.value) { 
                        if (longPressTimer && (Math.abs(e.clientX - startX) > 20 || Math.abs(e.clientY - startY) > 20)) { clearTimeout(longPressTimer); longPressTimer = null; isMovedForClick = true; } 
                        return; 
                    } 
                    if (e.cancelable) e.preventDefault(); 
                    let deltaX = e.clientX - startX; dragX.value = Math.max(-maxDrag, Math.min(maxDrag, deltaX * 0.85)); 
                };
                const onPointerUp = (e) => { 
                    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; if (!isMovedForClick) emit('action-click'); } 
                    if (isUnlocked.value) { 
                        isDragging.value = false; 
                        if (dragX.value <= -threshold) emit('view', props.itemData); 
                        else if (dragX.value >= threshold) emit('compare', props.itemData); 
                        dragX.value = 0; setTimeout(() => { isUnlocked.value = false; }, 300); 
                    } 
                };
                const closeOutside = (e) => { if (isUnlocked.value && trackRef.value && !trackRef.value.contains(e.target)) { isUnlocked.value = false; dragX.value = 0; } };
                const globalMove = (e) => { if (isUnlocked.value) onPointerMove(e); };
                const globalUp = (e) => { if (isUnlocked.value) onPointerUp(e); };
                onMounted(() => { window.addEventListener('pointerdown', closeOutside); window.addEventListener('pointermove', globalMove, { passive: false }); window.addEventListener('pointerup', globalUp); window.addEventListener('pointercancel', globalUp); }); 
                onUnmounted(() => { window.removeEventListener('pointerdown', closeOutside); window.removeEventListener('pointermove', globalMove); window.removeEventListener('pointerup', globalUp); window.removeEventListener('pointercancel', globalUp); });
                const overlayBackground = computed(() => { const baseDark = 'rgba(14, 19, 31, 0.9)'; if (dragX.value < 0) return `radial-gradient(circle at 10% 50%, rgba(45, 212, 191, ${Math.min(1, Math.abs(dragX.value) / maxDrag) * 0.5}), transparent 60%), ${baseDark}`; if (dragX.value > 0) return `radial-gradient(circle at 90% 50%, rgba(99, 91, 255, ${Math.min(1, dragX.value / maxDrag) * 0.5}), transparent 60%), ${baseDark}`; return baseDark; });
                return { trackRef, isUnlocked, isDragging, dragX, threshold, onPointerDown, onPointerMove, onPointerUp, overlayBackground };
            },
            template: `
            <div class="relative w-full touch-pan-y select-none prevent-select my-1" @contextmenu.prevent @pointerdown.stop="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" ref="trackRef">
                <div class="w-full transition-all duration-300 flex items-center" :class="[textClass, {'opacity-30': isUnlocked}]">{{ displayText }} <i v-if="showIcon" class="fa-solid fa-circle-info text-[10px] opacity-70 ml-1.5 shrink-0 mt-0.5"></i></div>
                <teleport to="body">
                    <transition name="modal-fade">
                        <div v-if="isUnlocked" @touchmove.prevent @pointermove.prevent class="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden touch-none" :style="{ background: overlayBackground, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }">
                            <div class="absolute top-[25%] w-full px-8 text-center transition-all duration-300" :class="dragX < -threshold ? 'text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)] scale-105' : (dragX > threshold ? 'text-stripe-blurple drop-shadow-[0_0_15px_rgba(99,91,255,0.5)] scale-105' : 'text-white')"><h2 class="text-2xl font-extrabold mb-2 leading-tight truncate tracking-tight">{{ displayText }}</h2><p class="text-xs font-semibold opacity-70" v-if="Math.abs(dragX) < threshold">← 左右滑動選擇操作 →</p><p class="text-xs font-semibold animate-pulse" v-else-if="dragX <= -threshold">放開以「查看細項」</p><p class="text-xs font-semibold animate-pulse" v-else-if="dragX >= threshold">放開以「加入比較」</p></div>
                            <div class="relative w-[320px] h-20 rounded-full border border-white/10 bg-black/20 shadow-inner flex items-center justify-between px-5 mt-10">
                                <div class="flex flex-col items-center justify-center w-20 transition-transform duration-200" :class="dragX < -threshold ? 'scale-110' : 'opacity-60'"><div class="w-12 h-12 rounded-full border flex items-center justify-center mb-2 transition-all" :class="dragX < -threshold ? 'border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.4)] bg-teal-900/60 text-teal-400' : 'border-white/20 bg-white/5 text-white/50'"><i class="fa-solid fa-file-lines text-lg"></i></div><span class="text-[10px] font-bold tracking-widest uppercase transition-colors" :class="dragX < -threshold ? 'text-teal-300' : 'text-white/50'">查看</span></div>
                                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white flex items-center justify-center text-gray-900 z-30 transition-shadow duration-200" :style="{ transform: 'translate3d(calc(-50% + ' + dragX + 'px), -50%, 0)', transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }" :class="dragX < -20 ? 'shadow-[0_0_30px_rgba(45,212,191,0.8)]' : (dragX > 20 ? 'shadow-[0_0_30px_rgba(99,91,255,0.8)]' : 'shadow-[0_0_20px_rgba(255,255,255,0.5)]')"><i class="fa-solid fa-arrow-right-arrow-left text-2xl"></i></div>
                                <div class="flex flex-col items-center justify-center w-20 transition-transform duration-200" :class="dragX > threshold ? 'scale-110' : 'opacity-60'"><div class="w-12 h-12 rounded-full border flex items-center justify-center mb-2 transition-all" :class="dragX > threshold ? 'border-stripe-blurple shadow-[0_0_20px_rgba(99,91,255,0.4)] bg-indigo-900/60 text-stripe-blurple' : 'border-white/20 bg-white/5 text-white/50'"><i class="fa-solid fa-scale-balanced text-lg"></i></div><span class="text-[10px] font-bold tracking-widest uppercase transition-colors" :class="dragX > threshold ? 'text-indigo-300' : 'text-white/50'">比較</span></div>
                            </div>
                        </div>
                    </transition>
                </teleport>
            </div>`
        };

        const DraggableFab = {
            props: ['count'], emits: ['open-modal'],
            setup(props, { emit }) {
                const fabRef = ref(null); 
                const getContainerWidth = () => { const el = document.getElementById('app'); return el ? el.clientWidth : window.innerWidth; };
                const getContainerHeight = () => { const el = document.getElementById('app'); return el ? el.clientHeight : window.innerHeight; };
                const pos = ref({ x: 0, y: 0 });
                onMounted(() => { pos.value = { x: getContainerWidth() - 80, y: getContainerHeight() - 150 }; });
                const currentTransform = ref({ x: 0, y: 0 }); const isDragging = ref(false); let startX = 0, startY = 0, initialPosX = 0, initialPosY = 0, isMoved = false;
                const onPointerDown = (e) => { isMoved = false; startX = e.clientX; startY = e.clientY; initialPosX = pos.value.x; initialPosY = pos.value.y; if (fabRef.value) fabRef.value.setPointerCapture(e.pointerId); };
                const onPointerMove = (e) => { if (e.buttons !== 1 && e.pointerType === 'mouse') return; if (!startX) return; const dx = e.clientX - startX; const dy = e.clientY - startY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { isMoved = true; isDragging.value = true; currentTransform.value = { x: dx, y: dy }; } };
                const onPointerUp = (e) => { 
                    if (fabRef.value) fabRef.value.releasePointerCapture(e.pointerId); 
                    if (!isMoved) emit('open-modal'); 
                    else { 
                        let newX = initialPosX + currentTransform.value.x; let newY = initialPosY + currentTransform.value.y; 
                        newX = Math.max(10, Math.min(getContainerWidth() - 70, newX)); newY = Math.max(10, Math.min(getContainerHeight() - 90, newY)); 
                        pos.value = { x: newX, y: newY }; 
                    } 
                    isDragging.value = false; currentTransform.value = { x: 0, y: 0 }; startX = 0; 
                };
                return { fabRef, pos, currentTransform, isDragging, onPointerDown, onPointerMove, onPointerUp };
            },
            template: `
            <div class="absolute z-[100] touch-none flex flex-col items-center justify-center cursor-pointer select-none prevent-select" ref="fabRef" @pointerdown.stop.prevent="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" :style="{ left: pos.x + 'px', top: pos.y + 'px', transform: 'translate3d(' + currentTransform.x + 'px, ' + currentTransform.y + 'px, 0)', transition: isDragging ? 'none' : 'left 0.2s ease, top 0.2s ease' }">
                <div class="w-14 h-14 rounded-full bg-gradient-to-r from-stripe-blurple to-fuchsia-500 text-white flex items-center justify-center text-xl shadow-[0_8px_30px_rgba(99,91,255,0.4)] border border-white/20" :class="{'scale-95': isDragging}"><i class="fa-solid fa-scale-balanced"></i></div>
                <div class="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-stripe-darkBg pulse-ring">{{ count }}</div>
            </div>`
        };

        const GamifiedCompareModal = {
            props: ['initialItems'], emits: ['close', 'update-list', 'analyze'],
            setup(props, { emit }) {
                const dockItems = ref([...props.initialItems]); const zoneItems = ref([]); const draggingItem = ref(null); const dragPos = ref({ x: 0, y: 0 }); const isHoveringZone = ref(false);
                const containerRef = ref(null); const zoneRef = ref(null); let startX = 0, startY = 0;
                const startDrag = (e, item, isFromZone = false) => { 
                    e.preventDefault(); draggingItem.value = { ...item, source: isFromZone ? 'zone' : 'dock' }; 
                    startX = e.clientX; startY = e.clientY; const el = e.currentTarget; el.setPointerCapture(e.pointerId); 
                    const rect = el.getBoundingClientRect(); const appRect = document.getElementById('app').getBoundingClientRect();
                    dragPos.value = { x: rect.left - appRect.left + rect.width / 2, y: rect.top - appRect.top + rect.height / 2 }; 
                };
                const onMove = (e) => { 
                    if (!draggingItem.value) return; 
                    dragPos.value.x += (e.clientX - startX); dragPos.value.y += (e.clientY - startY); startX = e.clientX; startY = e.clientY; 
                    if (zoneRef.value) { 
                        const zRect = zoneRef.value.getBoundingClientRect(); const appRect = document.getElementById('app').getBoundingClientRect(); 
                        const zCenter = { x: zRect.left - appRect.left + zRect.width / 2, y: zRect.top - appRect.top + zRect.height / 2 }; 
                        isHoveringZone.value = Math.hypot(dragPos.value.x - zCenter.x, dragPos.value.y - zCenter.y) < (zRect.width / 2 + 30); 
                    } 
                };
                const endDrag = (e) => { if (!draggingItem.value) return; const item = { ...draggingItem.value }; const source = item.source; if (isHoveringZone.value) { if (source === 'dock') { dockItems.value = dockItems.value.filter(i => i.id !== item.id); zoneItems.value.push(item); } } else { if (source === 'zone') { zoneItems.value = zoneItems.value.filter(i => i.id !== item.id); dockItems.value.push(item); } } emit('update-list', [...dockItems.value, ...zoneItems.value]); draggingItem.value = null; isHoveringZone.value = false; };
                const removeFromZone = (id) => { const idx = zoneItems.value.findIndex(i => i.id === id); if (idx > -1) { dockItems.value.push(zoneItems.value[idx]); zoneItems.value.splice(idx, 1); } };
                const removeFromDock = (id) => { dockItems.value = dockItems.value.filter(i => i.id !== id); emit('update-list', [...dockItems.value, ...zoneItems.value]); if (dockItems.value.length === 0 && zoneItems.value.length === 0) handleClose(); };
                const clearAll = () => { dockItems.value = []; zoneItems.value = []; emit('update-list', []); handleClose(); };
                const getOrbitStyle = (index, total) => { const radius = 110; const angle = (index / total) * 2 * Math.PI - Math.PI / 2; return { transform: 'translate(calc(-50% + ' + (Math.cos(angle) * radius) + 'px), calc(-50% + ' + (Math.sin(angle) * radius) + 'px))' }; };
                const handleClose = () => emit('close');
                const analyzeZone = () => emit('analyze', zoneItems.value);
                const analyzeAll = () => emit('analyze', [...dockItems.value, ...zoneItems.value]);
                return { dockItems, zoneItems, draggingItem, dragPos, isHoveringZone, zoneRef, containerRef, startDrag, onMove, endDrag, removeFromZone, removeFromDock, clearAll, getOrbitStyle, handleClose, analyzeZone, analyzeAll };
            },
            template: `
            <div class="absolute inset-0 z-[120] glass-panel flex flex-col items-center overflow-hidden touch-none select-none prevent-select" ref="containerRef" @pointermove="onMove" @pointerup="endDrag" @pointercancel="endDrag">
                <header class="w-full p-4 flex justify-between items-center text-gray-900 dark:text-white shrink-0 relative z-10">
                    <h2 class="font-extrabold tracking-tight"><i class="fa-solid fa-code-compare mr-2 text-stripe-blurple"></i>戰情分析台</h2>
                    <button @click="handleClose" class="w-8 h-8 bg-indigo-50 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-xmark text-indigo-400"></i></button>
                </header>
                <div class="flex-1 w-full flex items-center justify-center relative mt-[-10%]">
                    <div ref="zoneRef" class="w-48 h-48 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 relative z-10 shadow-sm" :class="isHoveringZone ? 'border-stripe-blurple bg-indigo-50/80 dark:bg-indigo-900/40 neon-glow-purple scale-110' : 'border-indigo-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 border-dashed'">
                        <i class="fa-solid fa-microchip text-4xl mb-2 transition-colors" :class="zoneItems.length >= 2 ? 'text-stripe-blurple animate-pulse' : 'text-indigo-200 dark:text-gray-500'"></i>
                        <span class="text-[10px] text-indigo-400 dark:text-gray-400 font-bold tracking-widest text-center uppercase" v-if="zoneItems.length === 0">拖曳至此<br>進行對比</span>
                        <span class="text-xs text-indigo-950 dark:text-white font-extrabold" v-else>已就緒 ({{ zoneItems.length }})</span>
                    </div>
                    <div v-for="(item, idx) in zoneItems" :key="item.id" class="absolute left-1/2 top-1/2 w-16 h-16 bg-white dark:bg-stripe-darkCard rounded-full flex items-center justify-center text-indigo-950 dark:text-white text-[10px] font-black shadow-md border border-indigo-100 dark:border-gray-700 cursor-grab active:cursor-grabbing orbit-item-transition z-20 touch-none" :class="{'opacity-30 scale-90': draggingItem && draggingItem.id === item.id}" :style="getOrbitStyle(idx, zoneItems.length)" @pointerdown.stop="startDrag($event, item, true)">
                        <div class="w-full px-2 text-center truncate leading-tight">{{ item.name.substring(0, 4) }}...</div>
                        <button @pointerdown.stop="removeFromZone(item.id)" class="absolute -top-1 -right-1 w-5 h-5 bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full flex items-center justify-center border border-rose-200 dark:border-rose-800/50 text-[8px] shadow-sm transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="w-full bg-white/90 backdrop-blur dark:bg-stripe-darkCard p-5 rounded-t-3xl border-t border-indigo-50 dark:border-gray-700 pb-safe shrink-0 relative z-10 shadow-[0_-10px_40px_rgba(99,91,255,0.06)] dark:shadow-none">
                    <div class="text-[10px] text-indigo-400 dark:text-gray-400 mb-3 font-extrabold flex justify-between items-center uppercase tracking-widest">
                        <span>待選清單 ({{ dockItems.length }})</span>
                        <div class="flex items-center gap-2"><button @click.stop="clearAll" class="text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1 font-bold"><i class="fa-solid fa-trash-can"></i> 清除</button></div>
                    </div>
                    <div class="flex overflow-x-auto no-scrollbar gap-3 pb-2 min-h-[70px]">
                        <div v-for="item in dockItems" :key="item.id" class="w-16 h-16 shrink-0 bg-indigo-50/50 dark:bg-gray-800 rounded-2xl border border-indigo-100/50 dark:border-gray-700 flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing relative transition-all duration-300 touch-none shadow-sm hover:border-stripe-blurple" :class="{'opacity-30 scale-90': draggingItem && draggingItem.id === item.id}" @pointerdown.stop="startDrag($event, item, false)">
                            <i class="fa-solid fa-box-open text-indigo-300 dark:text-gray-500 mb-1 text-lg"></i>
                            <span class="text-[8px] text-slate-700 dark:text-gray-300 text-center w-full truncate leading-none font-bold">{{ item.name }}</span>
                            <button @pointerdown.stop.prevent="removeFromDock(item.id)" class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full flex items-center justify-center border border-rose-200 dark:border-rose-800/50 text-[8px] transition-colors z-10 shadow-sm"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                        <div v-if="dockItems.length === 0" class="w-full text-center text-xs text-indigo-300 dark:text-gray-500 py-4 font-bold">所有商品已移至分析台</div>
                    </div>
                    <div class="flex gap-3 mt-4">
                        <button @click="analyzeZone" :disabled="zoneItems.length < 2" class="flex-1 py-3.5 bg-gradient-to-r from-stripe-blurple to-indigo-500 text-white rounded-full font-bold text-xs disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:bg-gray-700 shadow-sm hover:shadow-md hover:from-[#5446E5] hover:to-indigo-600 transition-all flex items-center justify-center gap-2"><i class="fa-solid fa-crosshairs"></i> 分析目標區 ({{ zoneItems.length }})</button>
                        <button @click="analyzeAll" :disabled="(dockItems.length + zoneItems.length) < 2" class="flex-1 py-3.5 bg-indigo-950 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-xs disabled:opacity-50 shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">分析全部 ({{ dockItems.length + zoneItems.length }})</button>
                    </div>
                </div>
                <div v-if="draggingItem" class="absolute top-0 left-0 w-16 h-16 bg-gradient-to-r from-stripe-blurple to-purple-500 rounded-xl flex flex-col items-center justify-center text-white p-1 shadow-2xl border-2 border-white dark:border-gray-800 z-[150] pointer-events-none opacity-95 scale-110" :style="{ transform: 'translate3d(calc(-50% + ' + dragPos.x + 'px), calc(-50% + ' + dragPos.y + 'px), 0)' }">
                    <i class="fa-solid fa-box-open mb-1 text-lg"></i>
                    <span class="text-[8px] text-center w-full truncate leading-none font-bold">{{ draggingItem.name }}</span>
                </div>
            </div>`
        };

        const app = createApp({
            components: { SeamlessActionItem, DraggableFab, GamifiedCompareModal },
            setup() {
                const isLoggedIn = ref(false); 
                const isLoggingIn = ref(false); 
                const loginForm = ref({ account: '', password: '' });
                const activeTab = ref('coverage'); 
                const coverageSubTab = ref('chat'); 
                const productSubTab = ref('compare'); 
                const toastMessage = ref('');
                
                const isDarkMode = ref(false);
                const toggleDarkMode = () => { 
                    isDarkMode.value = !isDarkMode.value; 
                    if (isDarkMode.value) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark'); 
                };

                const navItems = [ 
                    { id: 'coverage', label: '智能助理', icon: 'fa-solid fa-headset' }, 
                    { id: 'claims', label: '理賠試算', icon: 'fa-solid fa-file-invoice-dollar' }, 
                    { id: 'gaps', label: '客戶分析', icon: 'fa-solid fa-chart-pie' }, 
                    { id: 'products', label: '商品分析', icon: 'fa-solid fa-box-open' }, 
                    { id: 'pitch', label: '時事話術', icon: 'fa-solid fa-fire' } 
                ];
                
                const headerTitle = computed(() => { 
                    const titles = { 'coverage': '智能助理', 'claims': '理賠試算', 'gaps': '客戶分析', 'products': productSubTab.value === 'compare' ? '比較分析' : '相似推薦', 'pitch': '話題行銷' }; 
                    return titles[activeTab.value]; 
                });
                
                const headerSubtitle = computed(() => { 
                    const subs = { 'coverage': '24小時解答保障與理賠問題', 'claims': '快速查詢可申請項目與應備文件', 'gaps': 'AI 分析您的保障水位', 'products': productSubTab.value === 'compare' ? '對比理賠額度與專案條件' : '尋找更符合您需求的替代方案', 'pitch': '結合時事熱點生成切入話術' }; 
                    return subs[activeTab.value]; 
                });
                
                const isSimilarFiltersExpanded = ref(true);
                const isSelectorFiltersExpanded = ref(true);
                const isComboSelectorFiltersExpanded = ref(true);
                const isGlobalSettingsExpanded = ref(true);

                const showToast = (msg) => { toastMessage.value = msg; setTimeout(() => { toastMessage.value = ''; }, 2000); };

                const handleLogin = () => {
                    if (!loginForm.value.account || !loginForm.value.password) return; 
                    isLoggingIn.value = true;
                    setTimeout(() => {
                        isLoggedIn.value = true; isLoggingIn.value = false; 
                        showToast('登入成功，歡迎回來！'); 
                        activeTab.value = 'coverage'; coverageSubTab.value = 'chat';
                        setTimeout(() => {
                            if (window.driver && window.driver.js && typeof window.driver.js.driver === 'function') {
                                const driver = window.driver.js.driver;
                                const driverObj = driver({ showProgress: true, nextBtnText: '下一步', prevBtnText: '上一步', doneBtnText: '開始體驗', progressText: '{{current}} / {{total}}', popoverClass: 'custom-driver-popover', allowClose: false, steps: [ { popover: { title: '', description: '<div class="flex items-center gap-5 pt-2"><img src="img/aiimg.png" class="w-24 h-24 object-contain shrink-0 drop-shadow-xl"><div class="flex flex-col text-left"><h3 class="text-xl font-black text-indigo-950 dark:text-white mb-1.5 tracking-tight">歡迎使用保險智能腦</h3><p class="text-sm text-slate-700 dark:text-gray-300 leading-relaxed font-bold">讓我們先快速了解系統的幾個核心介面與功能！</p></div></div>' } }, { element: '#tour-nav', popover: { title: '五大模組切換', description: '您隨時可以在底部切換專屬功能。', side: 'top', align: 'center' } }, { element: '#tour-quick-queries', popover: { title: '快捷指令區', description: '一鍵點擊常用指令，或左右滑動查看更多。', side: 'top', align: 'start' } }, { element: '#tour-chat-input', popover: { title: '多模態輸入', description: '可點擊麥克風語音輸入，或點擊迴紋針上傳單據。', side: 'top', align: 'start' } }, { popover: { title: '💡 隱藏版高級操作', description: '長按 3 秒任何【商品名稱】即可解鎖「無縫推滑介面」！' } } ] });
                                driverObj.drive();
                            }
                        }, 500);
                    }, 1000);
                };

                const handleLogout = () => { isLoggedIn.value = false; loginForm.value = { account: '', password: '' }; activeTab.value = 'coverage'; showToast('已安全登出系統'); };
                const calculateAge = (birthday) => { if (!birthday) return '未知'; const birthDate = new Date(birthday); const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; return age + ' 歲'; };

                // 簡化的客戶資料
                const customersDB = [
                    {
                        id: 'C001', name: '王大明', phone: '0912-345-678', score: 72, idNumber: 'A123456789', customerType: 'VIP客戶', notes: '偏好高保障。', email: 'ming.wang@example.com', birthday: '1996-06-15', address: '台北市',
                        gaps: [ { name: '醫療實支實付', percent: 90 }, { name: '意外傷害', percent: 85 }, { name: '壽險保障', percent: 60 }, { name: '重大傷病/癌症', percent: 40 }, { name: '長期照顧', percent: 15 } ],
                        aiGood: '您的<span class="text-teal-600 dark:text-teal-400 font-bold">實支實付</span>與<span class="text-teal-600 dark:text-teal-400 font-bold">意外險</span>額度充足。',
                        aiBad: '目前的<span class="text-rose-500 font-bold">重大傷病</span>與<span class="text-rose-500 font-bold">長照</span>保障明顯不足。',
                        aiSuggestion: '可考慮增購「定期重大傷病險」。',
                        policies: [
                            {
                                id: 'pol_1', company: '三商美邦', policyNumber: 'BI150416001', effectiveDate: '115/04/16', issueAge: 30, paymentDate: '116/04/16', paymentFrequency: '年繳', totalPremium: '4,600', status: '保單正常', applicant: '王大明', applicantMode: 'same', notes: '',
                                products: [{ id: 'AFTL0', code: 'AFTL0', name: '安家福貸平準型定期壽險(期繳)', type: '主約', target: '本人', term: '20年期', amount: '200 萬元', premium: '4,600', status: '有效' }]
                            },
                            {
                                id: 'pol_2', company: '新光人壽', policyNumber: 'BI150311001', effectiveDate: '106/03/01', issueAge: 21, paymentDate: '116/03/01', paymentFrequency: '年繳', totalPremium: '112,580', status: '正常', applicant: '王大明', applicantMode: 'same', notes: '',
                                products: [
                                    { id: 'NFA', code: 'NFA', name: '誠新誠意終身保險(11302)', type: '主約', target: '本人', term: '20年期', amount: '100 萬元', premium: '107,600', status: '有效' },
                                    { id: 'OEA', code: 'OEA', name: 'MTR多型態定期壽險附約(新定義)(甲型)(11412)', type: '附約', target: '本人', term: '10年期', amount: '100 萬元', premium: '4,980', status: '有效' }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'C002', name: '林雅婷', phone: '0988-777-666', score: 92, idNumber: 'B223456789', customerType: '一般客戶', notes: '近期有購屋需求。', email: 'yating.lin@example.com', birthday: '1990-11-22', address: '台中市',
                        gaps: [ { name: '醫療實支實付', percent: 95 }, { name: '意外傷害', percent: 90 }, { name: '壽險保障', percent: 85 }, { name: '重大傷病/癌症', percent: 95 }, { name: '長期照顧', percent: 90 } ],
                        aiGood: '整體保障非常完整，防護網堅固。',
                        aiBad: '壽險保障略低，可再稍微補強。',
                        aiSuggestion: '可利用「定期壽險」補足缺口。',
                        policies: [
                            {
                                id: 'pol_3', company: '台灣人壽', policyNumber: 'TW55544433', effectiveDate: '2019-08-05', issueAge: 29, status: '有效', paymentDate: '每年8月5日', paymentFrequency: '年繳', applicant: '林雅婷', applicantMode: 'same', notes: '',
                                products: [
                                    { id: 'T02H3', code: 'T02H3', name: '傳承富滿利率變動型終身壽險', type: '主約', target: '本人', term: '20年期', amount: '10 萬元', premium: '3,500', status: '有效' },
                                    { id: 'HNR', code: 'HNR', name: '新住院醫療保險附約(HNR)', type: '醫療實支', target: '本人', term: '1年期', amount: '計畫三', premium: '4,600', status: '有效' },
                                    { id: 'SPAR', code: 'SPAR', name: '長安傷害保險附約(SPAR)', type: '意外險', target: '本人', term: '1年期', amount: '100 萬元', premium: '1,180', status: '有效' }
                                ]
                            }
                        ]
                    }
                ];

                const products = {
                    'XHB': { id: 'XHB', company: '全球人壽', shortName: '全球XHB', name: '實在醫靠醫療費用健康保險附約(XHB)', planType: '附約', insType: '醫療險', saleStatus: '現售', genDeath: '-', accDeath: '-', canDeath: '-', hospitalRoom: '1,500元', icuBurn: '-', icu: '-', outpatient: '-', convalescence: '-', surgery: '最高 20萬', misc: '最高 20萬', opSurgery: '有 (與雜費共用)', copy: '可副本', term: '1年期', unit: '計畫二', amount: '計畫二', premium: '3,200', tags: ['高雜費', '門診保障'], features: ['住院日額高於病房費可抵雜費'], rules: '1. 投保年齡：0~65歲', termsContent: '依保單條款約定給付保險金。', aiHighlights: [ { title: '高額雜費', desc: '住院雜費限額高，充分填補高額自費醫材缺口。' }, { title: '病房費靈活', desc: '住院日額高於病房費可抵雜費，資金運用更彈性。' } ], contentSummary: [ { title: '1. 住院醫療保障', points: ['給付每日病房費用', '給付住院期間各項醫療雜費'] }, { title: '2. 手術給付', points: ['包含住院手術及門診手術', '手術與雜費共用額度'] } ], targetAudience: ['重視醫療品質者', '小資族及家庭支柱'] },
                    'HNR': { id: 'HNR', company: '台灣人壽', shortName: '台灣HNR', name: '新住院醫療保險附約(HNR)', planType: '附約', insType: '醫療險', saleStatus: '停售', genDeath: '-', accDeath: '-', canDeath: '-', hospitalRoom: '2,000元', icuBurn: '-', icu: '-', outpatient: '-', convalescence: '-', surgery: '最高 16萬', misc: '最高 15萬', opSurgery: '有 (獨立額度)', copy: '可副本', term: '1年期', unit: '計畫三', amount: '計畫三', premium: '4,600', tags: ['熱門實支', '門診獨立'], features: ['門診手術擁有獨立額度'], rules: '1. 投保年齡：0~70歲', termsContent: '被保險人住院診療時，按費用核付。', aiHighlights: [ { title: '門診獨立額度', desc: '門診手術擁有獨立理賠額度，不與住院雜費共用。' }, { title: '費率平穩', desc: '各年齡層保費平穩，長期持有負擔較輕。' } ], contentSummary: [ { title: '1. 基礎醫療金', points: ['病房費與膳食費給付', '住院前後門診給付'] }, { title: '2. 手術與雜費', points: ['住院醫療雜費限額內實支', '門診手術專屬限額'] } ], targetAudience: ['尋求高CP值醫療險者', '有門診微創手術需求者'] },
                    'RM1': { id: 'RM1', company: '遠雄人壽', shortName: '遠雄RM1', name: '康富醫療健康保險附約(RM1)', planType: '附約', insType: '醫療險', saleStatus: '現售', genDeath: '-', accDeath: '-', canDeath: '-', hospitalRoom: '1,000元', icuBurn: '-', icu: '-', outpatient: '-', convalescence: '-', surgery: '無(併入雜費)', misc: '最高 30萬 (按日增)', opSurgery: '有 (共用)', copy: '僅限正本', term: '1年期', unit: '計畫一', amount: '計畫一', premium: '2,800', tags: ['超高雜費', '慰問金'], features: ['醫療雜費隨住院天數倍增'], rules: '僅限「正本」收據理賠', termsContent: '同一次住院期間最高給付以限額為準。', aiHighlights: [ { title: '超高額醫療雜費', desc: '醫療雜費額度極高，且會隨住院天數倍增。' }, { title: '住院慰問金', desc: '提供額外的住院慰問金，彌補隱形開銷。' } ], contentSummary: [ { title: '1. 高額雜費給付', points: ['住院雜費限額極高', '按住院日數增加雜費限額'] }, { title: '2. 慰問金給付', points: ['提供每日病房費用給付', '額外給付住院慰問保險金'] } ], targetAudience: ['擔心長期住院開銷者', '尋求頂級醫療保障者'] },
                    'SPAR': { id: 'SPAR', company: '台灣人壽', shortName: '台壽SPAR', name: '長安傷害保險附約(SPAR)', planType: '附約', insType: '意外險', saleStatus: '現售', genDeath: '-', accDeath: '100萬', canDeath: '-', hospitalRoom: '-', icuBurn: '-', icu: '-', outpatient: '-', convalescence: '-', surgery: '不適用', misc: '不適用', opSurgery: '不適用', copy: '可副本', term: '1年期', unit: '100萬', amount: '100', premium: '1,180', tags: ['保證續保', '意外保障'], features: ['保證續保至75歲'], rules: '1~6類職業不加費', termsContent: '因意外傷害事故給付保險金。', aiHighlights: [ { title: '保證續保', desc: '少見的保證續保至75歲，意外保障不中斷。' }, { title: '職業等級寬鬆', desc: '1~6類職業等級不加費，適合各類職場。' } ], contentSummary: [ { title: '1. 身故與失能', points: ['給付意外身故保險金', '依失能等級給付保險金'] }, { title: '2. 醫療實支', points: ['意外受傷門診/住院實支', '意外骨折未住院津貼'] } ], targetAudience: ['機車族與通勤族', '從事各類風險職業者'] },
                    'FB_PRJ': { id: 'FB_PRJ', company: '富邦人壽', shortName: '富邦專案', name: '富邦專案', planType: '專案', insType: '', saleStatus: '現售', premium: '(男) 197,600\n(女) 180,500', genDeath: '5.4萬', accDeath: '100萬', canDeath: '5.4萬', hospitalRoom: '1,000~2,000元', icuBurn: '-', icu: '2,000元', outpatient: '500元', convalescence: '500元', surgery: '依條款', misc: '依條款', opSurgery: '依條款', copy: '依條款', tags: ['專案', '醫療定額'], features: ['高住院日額'], term: '依各單品', unit: '專案組合', amount: '專案組合', rules: '依富邦規定', termsContent: '詳見條款', subItems: [ { type: '主約', code: 'FAW', name: '美添財實外幣', amount: '100', unit: '萬元', term: '2年期', premiumM: '175200', premiumF: '151000' }, { type: '醫療', code: 'HSV', name: '佳實在一年期醫療', amount: '計劃1', unit: '計劃', term: '1年期', premiumM: '3350', premiumF: '6500' } ], aiHighlights: [ { title: '高額住院日額', desc: '專案提供高額的每日住院補償，彌補薪資損失。' }, { title: '一次購足保障', desc: '主附約搭配，一次滿足基本醫療與壽險需求。' } ], contentSummary: [ { title: '1. 醫療定額給付', points: ['住院日額高給付', '加護病房額外補償'] }, { title: '2. 身故保障', points: ['一般身故給付', '意外身故加倍給付'] } ], targetAudience: ['偏好大品牌保險公司者', '希望一次規劃完整保障者'] },
                    'SK_PRJ': { id: 'SK_PRJ', company: '新光人壽', shortName: '新光專案', name: '新光專案', planType: '專案', insType: '', saleStatus: '現售', premium: '(男) 1,450\n(女) 1,480', genDeath: '100萬', accDeath: '100萬', canDeath: '100萬', hospitalRoom: '-', icuBurn: '4,000元', icu: '-', outpatient: '-', convalescence: '-', surgery: '依條款', misc: '依條款', opSurgery: '依條款', copy: '依條款', tags: ['專案', '高保障'], features: ['高額身故保障'], term: '依各單品', unit: '專案組合', amount: '專案組合', rules: '依新光規定', termsContent: '詳見條款', subItems: [ { type: '主約', code: 'NWA', name: '活力平安終身', amount: '100', unit: '萬元', term: '20年期', premiumM: '35000', premiumF: '32000' }, { type: '醫療', code: 'HAA', name: '安心住院醫療', amount: '計劃2', unit: '計劃', term: '1年期', premiumM: '4200', premiumF: '4800' } ], aiHighlights: [ { title: '高額身故保障', desc: '專案提供高額一般與意外身故保障，照顧家人。' }, { title: '特定傷病加倍', desc: '針對燒燙傷提供每日4,000元的高額定額給付。' } ], contentSummary: [ { title: '1. 壽險與意外', points: ['一般身故/全殘給付', '意外身故高額保障'] }, { title: '2. 特定醫療補償', points: ['燒燙傷病房額外給付', '安心住院醫療基礎保障'] } ], targetAudience: ['家庭經濟支柱', '重視重大意外防護者'] },
                    'AFTL0': { id: 'AFTL0', company: '三商美邦', shortName: '安家福貸', name: '安家福貸平準型定期壽險(期繳)', planType: '主約', insType: '壽險', saleStatus: '現售', tags: ['定期壽險'], term: '20年期', unit: '萬元', amount: '200', premium: '4,600', features: ['平準型保障'], rules: '依規定', termsContent: '詳見條款', aiHighlights: [ { title: '平準型保障', desc: '提供固定保額的平準型定期壽險，費率單純。' }, { title: '房貸防護網', desc: '適合用來轉嫁房貸風險，確保家人無後顧之憂。' } ], contentSummary: [ { title: '1. 身故保險金', points: ['疾病或意外導致身故給付保險金'] }, { title: '2. 失能保險金', points: ['完全失能時給付全額保障'] } ], targetAudience: ['房貸族', '有階段性高額壽險需求者'] },
                    'NFA': { id: 'NFA', company: '新光人壽', shortName: '誠新誠意', name: '誠新誠意終身保險(11302)', planType: '主約', insType: '壽險', saleStatus: '現售', tags: ['終身壽險'], term: '20年期', unit: '萬元', amount: '100', premium: '107,600', features: ['終身保障'], rules: '依規定', termsContent: '詳見條款', aiHighlights: [ { title: '終身保障', desc: '提供終身的壽險防護，並具有保單價值準備金。' }, { title: '彈性繳期', desc: '多種繳費年期可選，符合不同的財務規劃需求。' } ], contentSummary: [ { title: '1. 終身給付', points: ['身故保險金', '完全失能保險金'] }, { title: '2. 保單價值', points: ['具備保單借款功能', '解約金可作資金運用'] } ], targetAudience: ['重視資產傳承者', '需預留稅源的資產家'] },
                    'OEA': { id: 'OEA', company: '新光人壽', shortName: 'MTR定期壽', name: 'MTR多型態定期壽險附約(新定義)(甲型)(11412)', planType: '附約', insType: '壽險', saleStatus: '現售', tags: ['定期壽險'], term: '10年期', unit: '萬元', amount: '100', premium: '4,980', features: ['定期保障'], rules: '依規定', termsContent: '詳見條款', aiHighlights: [ { title: '低保費高保障', desc: '利用定期壽險特性，在關鍵時期換取高額保障。' }, { title: '靈活附加', desc: '作為附約可靈活附加於各類主約之下。' } ], contentSummary: [ { title: '1. 身故保險金', points: ['保險期間內身故給付'] }, { title: '2. 失能保險金', points: ['保險期間內完全失能給付'] } ], targetAudience: ['預算有限的年輕族群', '剛組成家庭的新手父母'] },
                    'SK_HX': { id: 'SK_HX', company: '新光人壽', shortName: '新光(原台新)HX', name: '新光 - (原台新)住院醫療費用健康保險附約', planType: '附約', insType: '醫療險', saleStatus: '現售', genDeath: '-', accDeath: '-', canDeath: '-', hospitalRoom: '依計畫', icuBurn: '加倍', icu: '加倍', outpatient: '有', convalescence: '-', surgery: '依計畫', misc: '特定加倍', opSurgery: '有', copy: '可副本', term: '1年期', unit: '計畫', amount: '計畫', premium: '依費率表', tags: ['保證續保至85歲', '理賠加倍', '無理賠增額'], features: ['入住加護病房/燒燙傷病房額度加倍', '連續兩年無理賠紀錄限額提高20%'], rules: '保證續保至85歲', termsContent: '詳見保單條款約定。', aiHighlights: [ { title: '保證續保', desc: '保險期間為一年，保證續保至被保險人保險年齡達八十五歲之保單週年日，保障不中斷。' }, { title: '理賠額度加倍', desc: '住院期間若接受特定手術，或入住加護病房、燒燙傷病房，每日病房費用及住院雜費與手術費用保險金限額提高為兩倍。' }, { title: '無理賠紀錄增額', desc: '若連續兩年以上未曾申領理賠，主要給付項目（病房費、雜費、前後門診、門診手術）的理賠限額將提高20%。' }, { title: '涵蓋門診手術', desc: '保障範圍包含門診手術費用，應對不需住院的新式微創手術趨勢。' }, { title: '納入住院前後門診', desc: '給付因同一事故住院前兩週及出院後兩週內的門診費用，讓保障更完整。' }, { title: '就醫選擇彈性', desc: '若於非全民健保特約醫院就診，各項醫療費用理賠將以實際支付金額的65%計算，提供更多就醫選擇。' } ], contentSummary: [ { title: '1. 每日病房費用保險金', points: ['給付超等住院之病房費差額、膳食費、特別護士以外之護理費等。', '若接受特定手術，限額將提高為兩倍，同一次住院給付最高365日。'] }, { title: '2. 住院雜費與手術費用保險金', points: ['給付醫師指示用藥、血液、掛號費、手術費、超過全民健康保險給付之住院醫療費用等。', '若接受特定手術或入住加護病房，限額將提高為兩倍。'] }, { title: '3. 住院前後門診費用保險金', points: ['給付住院前二週內或出院後二週內，因同一事故而需門診治療的費用。', '同一次住院給付最高以四次為限。'] }, { title: '4. 門診手術費用保險金', points: ['給付因接受門診手術所產生的醫療費用。', '手術項目需符合健保支付標準或保單附表所列項目。'] }, { title: '5. 加護病房費用保險金', points: ['除每日病房費用保險金外，另每日額外給付加護病房費用。', '適用於加護病房、燒燙傷病房、骨髓移植隔離病床或呼吸照護中心。'] }, { title: '6. 無理賠紀錄增額保險金', points: ['若投保後兩年以上無理賠紀錄，再次申請理賠時，主要給付項目限額提高20%。', '此為對健康客戶的優惠，提高實際保障額度。'] } ], targetAudience: ['社會新鮮人與小資族', '已有基本醫療保障者', '三明治族群與家庭支柱'] }
                };

                const similarDB = {
                    'XHB': [{ id: 'HNR', name: '新住院醫療保險附約(HNR)', match: 92, tags: ['保費相近', '門診獨立'], reason: '最大差異在台灣HNR門診手術有獨立額度。' }, { id: 'RM1', name: '康富醫療附約(RM1)', match: 85, tags: ['雜費極高', '需正本'], reason: '若看重醫療雜費，RM1雜費最高達30萬，但限正本。' }],
                    'HNR': [{ id: 'XHB', name: '實在醫靠醫療險(XHB)', match: 92, tags: ['病房抵雜費', '費率平穩'], reason: 'XHB特點是日額若高於病房費，可抵雜費。' }]
                };

                const customCombos = ref([
                    { id: 'cc_1', company: '組合', shortName: '小資雙實支', name: '小資族必備雙實支組合', planType: '自訂組合', saleStatus: '現售', subItems: [ { type: '醫療險', code: 'XHB', name: '實在醫靠醫療費用健康保險附約(XHB)', amount: '計畫二', unit: '計畫', term: '1年期', premiumM: '3200', premiumF: '3200' }, { type: '醫療險', code: 'HNR', name: '新住院醫療保險附約(HNR)', amount: '計畫三', unit: '計畫', term: '1年期', premiumM: '4600', premiumF: '4600' } ] },
                    { id: 'cc_2', company: '組合', shortName: '意外+醫療', name: '全方位意外醫療防護網', planType: '自訂組合', saleStatus: '現售', subItems: [ { type: '意外險', code: 'SPAR', name: '長安傷害保險附約(SPAR)', amount: '100', unit: '萬元', term: '1年期', premiumM: '1180', premiumF: '1180' }, { type: '醫療險', code: 'RM1', name: '康富醫療健康保險附約(RM1)', amount: '計畫一', unit: '計畫', term: '1年期', premiumM: '2800', premiumF: '2800' } ] },
                    { id: 'cc_3', company: '組合', shortName: '壽險基石', name: '家庭支柱雙壽險組合', planType: '自訂組合', saleStatus: '現售', subItems: [ { type: '壽險', code: 'NFA', name: '誠新誠意終身保險(11302)', amount: '100', unit: '萬元', term: '20年期', premiumM: '107600', premiumF: '107600' }, { type: '壽險', code: 'AFTL0', name: '安家福貸平準型定期壽險', amount: '200', unit: '萬元', term: '20年期', premiumM: '4600', premiumF: '4600' } ] }
                ]);

                const uniqueCompanies = computed(() => { const comps = new Set(); Object.values(products).forEach(p => comps.add(p.company)); return Array.from(comps); });
                const companyList = computed(() => uniqueCompanies.value);
                const productList = computed(() => Object.values(products).map(p => p.name));
                const productOptions = computed(() => Object.values(products).map(p => ({ value: p.id, label: p.shortName })));
                const companyOptions = computed(() => uniqueCompanies.value.map(c => ({ value: c, label: c })));

                const compareCategories = [
                    { title: '保障儲蓄內容', icon: 'fa-solid fa-piggy-bank text-indigo-400', keys: { genDeath: '保障-一般身故', accDeath: '保障-意外身故', canDeath: '保障-癌症身故' } },
                    { title: '疾病醫療定額', icon: 'fa-solid fa-notes-medical text-teal-400', keys: { hospitalRoom: '疾病-住院日額(每日)', icuBurn: '疾病-加護/燒燙傷(每日加計)', icu: '疾病-加護病房(每日加計)', outpatient: '疾病-住院前後門診', convalescence: '疾病-出院/住院療養金(每日)' } },
                    { title: '實支實付與其他', icon: 'fa-solid fa-file-invoice-dollar text-purple-400', keys: { surgery: '每次手術限額', misc: '醫療雜費限額', opSurgery: '門診手術', copy: '收據規定' } }
                ];

                const isCompareResultVisible = ref(false); const showCompareSettingsModal = ref(false);
                const compareGlobalSettings = ref({ age: 30, gender: 'M', jobClass: '1', paymentFrequency: '年繳' });
                const isCompareSlotsExpanded = ref(true);
                
                const getPremiumByGender = (premiumStr, gender) => {
                    if (!premiumStr) return '';
                    if (premiumStr.includes('(男)') && premiumStr.includes('(女)')) {
                        const lines = premiumStr.split('\n'); const targetPrefix = gender === 'M' ? '(男)' : '(女)'; const targetLine = lines.find(l => l.includes(targetPrefix));
                        if (targetLine) return targetLine.replace(targetPrefix, '').trim();
                    }
                    return premiumStr;
                };

                watch(() => compareGlobalSettings.value.gender, (newGender) => { 
                    compareSlots.value.forEach(slot => { 
                        if (slot.prodId) { 
                            const p = products[slot.prodId]; 
                            if (p && p.premium && p.premium.includes('(男)')) { slot.premium = getPremiumByGender(p.premium, newGender); } 
                        } 
                    }); 
                });

                const getTermYears = (term, currentAge) => {
                    if (!term) return 1;
                    if (term.includes('年期')) { const match = term.match(/\d+/); return match ? parseInt(match[0]) : 1; }
                    if (term.includes('至') && term.includes('歲')) { const match = term.match(/\d+/); if (match) { const targetAge = parseInt(match[0]); return Math.max(1, targetAge - currentAge); } }
                    if (term === '終身') return 20; return 1;
                };

                const calculateItemTotalPremium = (item) => { const premStr = compareGlobalSettings.value.gender === 'M' ? item.premiumM : item.premiumF; const val = parseInt(String(premStr).replace(/,/g, '')) || 0; const years = getTermYears(item.term, compareGlobalSettings.value.age); return val * years; };
                const getProduct = (id) => { if (products[id]) return products[id]; const cc = customCombos.value.find(c => c.id === id); if (cc) return cc; return null; };
                const initSlotSubItems = (prodId) => { const p = getProduct(prodId); if (!p) return []; if (p.subItems) return JSON.parse(JSON.stringify(p.subItems)); return [{ type: p.planType || '附約', code: p.id, name: p.name, amount: p.unit === '萬元' ? parseInt(p.amount) || '100' : p.amount, unit: p.unit || '萬元', term: p.term || '1年期', premiumM: String(p.premium).replace(/,/g,'').match(/\d+/) ? String(p.premium).replace(/,/g,'').match(/\d+/)[0] : '0', premiumF: String(p.premium).replace(/,/g,'').match(/\d+/) ? String(p.premium).replace(/,/g,'').match(/\d+/)[0] : '0' }]; };
                const getSlotTotalPremium = (slot) => { if (!slot.subItems || slot.subItems.length === 0) return '-'; let total = 0; slot.subItems.forEach(item => { const premStr = compareGlobalSettings.value.gender === 'M' ? item.premiumM : item.premiumF; const val = parseInt(String(premStr).replace(/,/g, '')) || 0; total += val; }); return '$ ' + total.toLocaleString(); };
                const getSlotTotalOverallPremium = (slot) => { if (!slot.subItems || slot.subItems.length === 0) return '-'; let total = 0; slot.subItems.forEach(item => { total += calculateItemTotalPremium(item); }); return '$ ' + total.toLocaleString(); };

                const openCompareSettingsModal = () => { compareSlots.value.forEach(slot => { if (slot.prodId && (!slot.subItems || slot.subItems.length === 0)) { slot.subItems = initSlotSubItems(slot.prodId); } }); showCompareSettingsModal.value = true; };
                const confirmCompareSettings = () => { isCompareResultVisible.value = true; showCompareSettingsModal.value = false; showToast('✅ 設定已套用'); };

                const showProductSelectorModal = ref(false); const activeSlotIndex = ref(-1);
                const searchComp = ref(''); const searchProd = ref(''); const searchType = ref(''); const searchStatus = ref('');

                const selectorActiveTab = ref('single');

                const modalCompanyOptions = computed(() => uniqueCompanies.value.map(c => ({ value: c, label: c })));
                const modalProductOptions = computed(() => { let res = Object.values(products); if (searchComp.value) res = res.filter(p => p.company === searchComp.value); return res.map(p => ({ value: p.id, label: p.name })); });
                const filteredProductsForSelector = computed(() => {
                    let res = [];
                    if (selectorActiveTab.value === 'single') res = Object.values(products).filter(p => p.planType !== '專案');
                    else if (selectorActiveTab.value === 'recommended') res = Object.values(products).filter(p => p.planType === '專案');
                    else if (selectorActiveTab.value === 'custom') res = customCombos.value;
                    if (searchComp.value) res = res.filter(p => p.company === searchComp.value || p.company === '組合');
                    if (searchProd.value) res = res.filter(p => p.id === searchProd.value);
                    if (searchType.value) res = res.filter(p => p.planType === searchType.value || p.insType === searchType.value);
                    if (searchStatus.value) res = res.filter(p => p.saleStatus === searchStatus.value || p.saleStatus === undefined);
                    return res;
                });

                const resetModalSearch = () => { searchComp.value = ''; searchProd.value = ''; searchType.value = ''; searchStatus.value = ''; };
                const openProductSelector = (idx) => { activeSlotIndex.value = idx; resetModalSearch(); selectorActiveTab.value = 'single'; showProductSelectorModal.value = true; };
                const closeProductSelector = () => { 
                    showProductSelectorModal.value = false; 
                    if (activeSlotIndex.value !== -1 && compareSlots.value[activeSlotIndex.value] && !compareSlots.value[activeSlotIndex.value].prodId) { compareSlots.value.splice(activeSlotIndex.value, 1); } 
                    if (!compareSlots.value.some(s => s.prodId)) isCompareResultVisible.value = false; 
                    activeSlotIndex.value = -1; 
                };
                
                const compareList = ref([]); const showGamifiedModal = ref(false); 
                const addToCompare = (item) => { 
                    if (!compareList.value.find(c => c.id === item.id)) { 
                        compareList.value.push({ id: item.id, name: item.name, company: item.company }); showToast(`✨已加入！`); 
                        if(compareList.value.length === 1) setTimeout(() => showToast('👉 點擊懸浮按鈕開啟分析台'), 2500); 
                    } else { 
                        showToast('❗該商品已在清單中'); 
                    } 
                };
                const updateCompareList = (newList) => { compareList.value = newList; };

                const compareSlots = ref([]); const draggingIndex = ref(-1); let lastSwapTime = 0;
                const addCompareSlot = () => { if (compareSlots.value.length < 4) { compareSlots.value.push({ uniqueId: 'slot_' + Math.random().toString(36).substr(2, 9), prodId: '', subItems: [] }); openProductSelector(compareSlots.value.length - 1); } };
                const removeCompareSlot = (idx) => { compareSlots.value.splice(idx, 1); if (!compareSlots.value.some(s => s.prodId)) { isCompareResultVisible.value = false; } };
                const isProductSelected = (prodId) => { return compareSlots.value.some((slot, idx) => slot.prodId === prodId && idx !== activeSlotIndex.value); };
                const selectProductForSlot = (prodId) => { 
                    if (activeSlotIndex.value !== -1) { 
                        if (isProductSelected(prodId)) { showToast('❗該商品已在比較表囉！'); return; } 
                        const slot = compareSlots.value[activeSlotIndex.value]; 
                        slot.prodId = prodId; slot.subItems = initSlotSubItems(prodId); 
                        isCompareResultVisible.value = false; 
                    } 
                    showProductSelectorModal.value = false; activeSlotIndex.value = -1; 
                };

                const onSlotDragStart = (idx, e) => { 
                    if (e.pointerType === 'mouse' && e.button !== 0) return; 
                    draggingIndex.value = idx; 
                    const onMove = (moveEvent) => { 
                        if (draggingIndex.value === -1) return; 
                        if (Date.now() - lastSwapTime < 250) return; 
                        const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY); 
                        const dropEl = elements.find(el => el.classList && el.classList.contains('slot-item')); 
                        if (dropEl) { 
                            const targetIdx = parseInt(dropEl.dataset.idx); 
                            if (!isNaN(targetIdx) && targetIdx !== draggingIndex.value) { 
                                const temp = compareSlots.value[draggingIndex.value]; 
                                compareSlots.value[draggingIndex.value] = compareSlots.value[targetIdx]; 
                                compareSlots.value[targetIdx] = temp; 
                                draggingIndex.value = targetIdx; lastSwapTime = Date.now(); 
                            } 
                        } 
                    }; 
                    const onEnd = () => { 
                        draggingIndex.value = -1; 
                        window.removeEventListener('pointermove', onMove); 
                        window.removeEventListener('pointerup', onEnd); 
                        window.removeEventListener('pointercancel', onEnd); 
                    }; 
                    window.addEventListener('pointermove', onMove, { passive: false }); 
                    window.addEventListener('pointerup', onEnd); window.addEventListener('pointercancel', onEnd); 
                };

                const handleAnalyzeAction = (itemsToAnalyze) => { 
                    if(itemsToAnalyze.length < 2) return; 
                    showGamifiedModal.value = false; activeTab.value = 'products'; productSubTab.value = 'compare'; compareSlots.value = []; 
                    itemsToAnalyze.slice(0, 4).forEach(item => compareSlots.value.push({ uniqueId: 'slot_' + Math.random().toString(36).substr(2, 9), prodId: item.id, subItems: initSlotSubItems(item.id) })); 
                    isCompareResultVisible.value = false; showToast(`🔍 已載入 ${itemsToAnalyze.slice(0, 4).length} 項商品`); 
                };

                const selectedCompany = ref('全球人壽'); const similarTarget = ref('XHB');
                const filteredProductsForSimilar = computed(() => Object.values(products).filter(p => p.company === selectedCompany.value));
                const filteredProductOptions = computed(() => filteredProductsForSimilar.value.map(p => ({ value: p.id, label: p.name })));
                const onCompanyChange = () => { const firstProd = filteredProductsForSimilar.value[0]; similarTarget.value = firstProd ? firstProd.id : ''; };
                const getSimilarProducts = (id) => similarDB[id] || [];
                const jumpToCompare = (id1, id2) => { compareSlots.value = [{ uniqueId: 'slot_' + Math.random().toString(36).substr(2, 9), prodId: id1, subItems: initSlotSubItems(id1) }, { uniqueId: 'slot_' + Math.random().toString(36).substr(2, 9), prodId: id2, subItems: initSlotSubItems(id2) }]; activeTab.value = 'products'; productSubTab.value = 'compare'; isCompareResultVisible.value = false; };

                const selectedProductDetail = ref(null); const showRulesModal = ref(false); const showTermsModal = ref(false);
                const openProductModal = (identifier) => { 
                    if (!identifier) return; 
                    let searchName = typeof identifier === 'string' ? identifier : identifier.name; 
                    for (const key in products) { 
                        if (products[key].name === searchName || products[key].shortName === searchName || key === searchName) { 
                            selectedProductDetail.value = products[key]; return; 
                        } 
                    } 
                    selectedProductDetail.value = { id: 'fallback', company: identifier.company || '未知保險公司', shortName: searchName || '未知商品', name: searchName || '未知商品', tags: ['一般保障'], term: '請參閱條款', unit: '依保單', amount: '依約定', premium: '依費率表', features: ['本系統未完全建檔之商品', '建議查閱正式保單條款'], coverage: [{ label: '給付限額', value: '請參閱約定' }], rules: '未建檔', termsContent: '請查閱正式條款。' }; 
                };
                const closeProductModal = () => { selectedProductDetail.value = null; showRulesModal.value = false; showTermsModal.value = false; };
                const highlightDiff = (val) => { if (!val || val === '-') return '<span class="text-indigo-200 dark:text-gray-600">-</span>'; if (val.includes('100萬') || val.includes('萬') || val.includes('1,000') || val.includes('2,000') || val.includes('獨立') || val.includes('可副本')) return `<span class="text-teal-600 dark:text-teal-400 font-bold">${val}</span>`; if (val.includes('僅限正本') || val.includes('無') || val.includes('不適用')) return `<span class="text-rose-500 font-bold">${val}</span>`; return val; };

                const userInput = ref(''); const isTyping = ref(false); const chatContainer = ref(null); const quickQueryContainer = ref(null);
                const messages = ref([{ role: 'bot', text: '您好！我是您的智能助理。您可以直接輸入問題，或點選下方「快速查詢」。', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
                const quickQueries = ['🧾 智能解析理賠收據', '⚖️ 比較富邦與新光專案', '💰 查詢理賠額度', '⛽ 油價大漲，檢視保障', '住院一天理賠多少？'];
                const chatFileInput = ref(null); const chatAttachment = ref(null);
                const triggerChatFileUpload = () => { chatFileInput.value.click(); };
                const handleChatFileUpload = (e) => { if (e.target.files[0]) { chatAttachment.value = e.target.files[0]; showToast('已夾帶檔案'); } e.target.value = ''; };
                const removeChatAttachment = () => { chatAttachment.value = null; };

                const isRecording = ref(false); let recognition = null;
                const simulateVoiceInput = () => { 
                    isRecording.value = true; 
                    setTimeout(() => { 
                        if (isRecording.value) { 
                            const mockTexts = ['我想了解醫療實支實付', '這次住院可以理賠多少？', '幫我比較這兩個商品']; 
                            const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)]; 
                            userInput.value = userInput.value ? userInput.value + ' ' + randomText : randomText; 
                            isRecording.value = false; showToast('✅ 模擬語音成功'); 
                        } 
                    }, 2500); 
                };
                
                const toggleVoiceInput = () => { 
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
                    if (!SpeechRecognition) { showToast('⚠️ 瀏覽器不支援，啟用語音模擬'); simulateVoiceInput(); return; } 
                    if (isRecording.value) { if (recognition) recognition.stop(); isRecording.value = false; return; } 
                    try { 
                        recognition = new SpeechRecognition(); recognition.continuous = false; recognition.lang = 'zh-TW'; 
                        recognition.onstart = () => { isRecording.value = true; showToast('🎙️ 麥克風已啟動...'); }; 
                        recognition.onresult = (event) => { if (event.results[0][0].transcript) userInput.value = userInput.value ? userInput.value + ' ' + event.results[0][0].transcript : event.results[0][0].transcript; }; 
                        recognition.onerror = (event) => { if (event.error === 'not-allowed') { showToast('⚠️ 權限受限，啟用語音模擬'); simulateVoiceInput(); } else { isRecording.value = false; showToast(`❌ 發生錯誤 (${event.error})`); } }; 
                        recognition.onend = () => { if (recognition) isRecording.value = false; }; recognition.start(); 
                    } catch (e) { showToast('⚠️ 無法啟動，啟用模擬'); simulateVoiceInput(); } 
                };

                const isDragging = ref(false); const startXDrag = ref(0); const scrollLeft = ref(0); let dragged = false;
                const startDrag = (e) => { isDragging.value = true; dragged = false; startXDrag.value = e.pageX - quickQueryContainer.value.offsetLeft; scrollLeft.value = quickQueryContainer.value.scrollLeft; };
                const onDrag = (e) => { if (!isDragging.value) return; e.preventDefault(); const walk = ((e.pageX - quickQueryContainer.value.offsetLeft) - startXDrag.value) * 2; if (Math.abs(walk) > 5) dragged = true; quickQueryContainer.value.scrollLeft = scrollLeft.value - walk; };
                const stopDrag = () => { isDragging.value = false; };
                const scrollToBottom = async () => { await nextTick(); if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight; };
                const handleQuickQuery = (query) => { if (dragged) return; userInput.value = query; sendMessage(query); };

                const sendMessage = async (text) => {
                    if ((!text?.trim() && !chatAttachment.value) || isTyping.value) return;
                    const newMsg = { role: 'user', text: text?.trim(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
                    if (chatAttachment.value) newMsg.attachment = { name: chatAttachment.value.name };
                    messages.value.push(newMsg); userInput.value = ''; chatAttachment.value = null; if (isRecording.value && recognition) recognition.stop();
                    isTyping.value = true; scrollToBottom();
                    if (text.includes('試算') || text.includes('收據') || text.includes('比較') || text.includes('理賠多少')) {
                        setTimeout(() => {
                            let botReply = '根據保單總覽，此項目在保障範圍內。詳細額度建議查看條款。'; let claimsData = null; let compareData = null; let estimatedClaim = null;
                            if (text.includes('試算') || text.includes('收據')) { 
                                botReply = '預估可申請的理賠明細如下：'; estimatedClaim = { total: 'NT$ 42,000', breakdown: [{ name: '病房費差額', source: '實在醫靠醫療費用健康保險附約(XHB)', policyNumber: 'GL10087654', amount: '4,500' }, { name: '住院醫療雜費', source: '實在醫靠醫療費用健康保險附約(XHB)', policyNumber: 'GL10087654', amount: '25,500' }, { name: '住院日額補償', source: '康富醫療健康保險附約(RM1)', policyNumber: 'RM99887766', amount: '12,000' }] }; 
                            } else if (text.includes('比較')) { 
                                botReply = '為您對比專案亮點：'; compareData = { prod1: { name: '富邦專案', id: 'FB_PRJ' }, prod2: { name: '新光專案', id: 'SK_PRJ' }, rows: [{ label: '意外身故', val1: '100萬', val2: '100萬' }, { label: '住院日額', val1: '1,000~2,000元', val2: '-' }, { label: '加護病房', val1: '2,000元', val2: '-' }, { label: '燒燙傷', val1: '-', val2: '4,000元' }] }; 
                            } else if (text.includes('理賠多少')) { 
                                botReply = '針對本次事故，預估理賠明細如下：'; claimsData = [{ company: '中國人壽', product: '時時保護意外險', amount: '30,000元' }, { company: '台新金控', product: '保障骨折險', amount: '依診斷書' }]; 
                            } 
                            isTyping.value = false; messages.value.push({ role: 'bot', text: botReply, claimsData, compareData, estimatedClaim, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }); scrollToBottom();
                        }, 1200); return;
                    }
                    try {
                        const systemPrompt = "你是一位專業的台灣保險業務助理。請簡潔回答客戶問題，可使用Emoji。";
                        const payload = { contents: [{ parts: [{ text: text?.trim() }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
                        const replyText = await fetchGemini(payload); messages.value.push({ role: 'bot', text: replyText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                    } catch (error) {
                        messages.value.push({ role: 'bot', text: '⚠️ 網路連線不穩，請稍後再試。', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                    } finally { isTyping.value = false; scrollToBottom(); }
                };

                const selectedIncident = ref(null);
                const claimIncidents = [ 
                    { id: 'accident', name: '意外受傷', icon: 'fa-solid fa-person-falling-burst', items: ['意外實支', '意外骨折', '意外住院'], docs: [{ title: '診斷證明書', desc: '需載明受傷狀況' }, { title: '醫療收據', desc: '可副本理賠' }], bgClass: 'bg-rose-100/50', colorClass: 'text-rose-500' },
                    { id: 'hospital', name: '疾病住院', icon: 'fa-solid fa-bed-pulse', items: ['病房費用', '住院雜費', '出院療養'], docs: [{ title: '診斷證明書', desc: '載明入出院日期' }, { title: '收據及明細', desc: '申請實支實付用' }], bgClass: 'bg-teal-100/50', colorClass: 'text-teal-600' },
                    { id: 'surgery', name: '手術治療', icon: 'fa-solid fa-syringe', items: ['手術保險金', '特定醫材實支'], docs: [{ title: '診斷證明書', desc: '載明手術名稱與部位' }, { title: '費用明細', desc: '需列出自費特材' }], bgClass: 'bg-indigo-100/50', colorClass: 'text-indigo-600' }
                ];

                const claimCalcStatus = ref('idle'); const estimatedClaimResult = ref(null);
                const claimSearchQuery = ref(''); const selectedClaimCustomer = ref(null);
                const claimFilteredCustomers = computed(() => { if (!claimSearchQuery.value) return []; const q = claimSearchQuery.value.toLowerCase(); return customersDB.filter(c => c.name.includes(q) || c.phone.includes(q)); });
                
                watch(selectedIncident, () => { claimCalcStatus.value = 'idle'; estimatedClaimResult.value = null; selectedClaimCustomer.value = null; claimSearchQuery.value = ''; });
                
                const matchedClaimCompanies = computed(() => {
                    if (!selectedIncident.value || !selectedClaimCustomer.value) return [];
                    // 直接回傳假的匹配結果畫面
                    return [
                        {
                            company: '台灣人壽',
                    policyNumbers: ['TW55544433'],
                            items: ['傷害身故保險金', '傷害醫療日額保險金', '傷害限額(實支實付)醫療保險金'],
                            docs: [
                                { title: '保險金申請書及應檢附文件', desc: '' },
                                { title: '死亡證明書或相驗屍體證明書', desc: '' },
                                { title: '被保險人除戶戶籍謄本', desc: '' },
                                { title: '受益人之身份證明文件或戶口名簿影本', desc: '' },
                                { title: '意外傷害事故證明文件', desc: '' },
                                { title: '保險單', desc: '' },
                                { title: 'FATCA暨 CRS 身分聲明書', desc: '' },
                                { title: '詳細醫師診斷書', desc: '' },
                                { title: '傷害事故證明文件', desc: '' },
                                { title: '收據副本及費用明細表', desc: '' }
                            ]
                        },
                        {
                            company: '全球人壽',
                    policyNumbers: ['GL10087654'],
                            items: ['身故保險金', '傷害住院醫療保險金(日額)', '傷害醫療保險金(實支實付)'],
                            docs: [
                                { title: '理賠申請書', desc: '' },
                                { title: '保險單', desc: '' },
                                { title: '受益人生存身份證明', desc: '' },
                                { title: '被保險人除戶戶籍謄本', desc: '' },
                                { title: '相驗屍體證明書或死亡診斷書', desc: '' },
                                { title: '意外傷害事故證明文件', desc: '' },
                                { title: '據以診斷之病理、檢驗或專業評量表', desc: '' },
                                { title: '美國海外帳戶FATCA及CRS身分聲明書', desc: '' },
                                { title: '醫療診斷書或住院、外科手術證明', desc: '' },
                                { title: '依約應附之醫療費用收據或費用證明', desc: '' },
                                { title: '社會保險給付證明文件', desc: '' },
                                { title: 'Ｘ光片', desc: '' },
                                { title: '意外傷害事故證明文件、請假證明', desc: '' }
                            ]
                        }
                    ];
                });
                const resetClaimCalc = () => { claimCalcStatus.value = 'idle'; estimatedClaimResult.value = null; };

                const expandedClaimCompanies = ref({});
                const toggleClaimCompany = (company) => { expandedClaimCompanies.value[company] = !expandedClaimCompanies.value[company]; };
                watch(matchedClaimCompanies, (newVals) => {
                    const newState = {};
                    if (newVals) newVals.forEach(c => newState[c.company] = true);
                    expandedClaimCompanies.value = newState;
                }, { immediate: true });

                const handleClaimCalcUpload = async (e) => {
                    const file = e.target.files[0]; if (!file) return; claimCalcStatus.value = 'processing';
                    const reader = new FileReader(); reader.readAsDataURL(file);
                    reader.onload = async () => {
                        const base64Data = reader.result.split(',')[1]; const mimeType = file.type;
                        try {
                            const prompt = `分析這張單據圖片，提取總金額以及各項費用明細。如果是無關圖片請自行編造一個合理的保險理賠試算數據。請只回傳合法的JSON格式，包含 total 和 breakdown 陣列 (每個物件包含 name, source, policyNumber, amount 屬性)： { "total": "NT$ 總金額", "breakdown": [{ "name": "項目名稱", "amount": "金額", "source": "保單名稱(包含代碼)", "policyNumber": "保單號碼" }] }`;
                            const payload = { contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }], generationConfig: { responseMimeType: "application/json" } };
                            const jsonText = await fetchGemini(payload); const result = JSON.parse(jsonText); estimatedClaimResult.value = result; claimCalcStatus.value = 'done'; showToast('✨ AI 解析完成');
                        } catch (error) { setTimeout(() => { estimatedClaimResult.value = { total: 'NT$ 41,500', breakdown: [{ name: '病房費限額', source: '新住院醫療保險附約(HNR)', policyNumber: 'TW55544433', amount: '4,000' }, { name: '住院醫療雜費', source: '實在醫靠醫療費用健康保險附約(XHB)', policyNumber: 'GL10087654', amount: '25,500' }, { name: '意外骨折未住院', source: '長安傷害保險附約(SPAR)', policyNumber: 'TW55544433', amount: '12,000' }] }; claimCalcStatus.value = 'done'; showToast('✅ 模擬解析完成'); }, 1000); } finally { e.target.value = ''; }
                    };
                    reader.onerror = () => { claimCalcStatus.value = 'idle'; showToast('讀取檔案失敗'); };
                };

                const searchQuery = ref(''); const selectedCustomer = ref(null);
                const isCustomerExpanded = ref(false); const isEditingCustomer = ref(false); const editCustomerData = ref({});
                const expandedPolicies = ref({}); const editingPolicies = ref({}); const editPolicyData = ref({});
                const isAddingCustomer = ref(false); const newCustomerData = ref({ name: '', idNumber: '', phone: '', birthday: '', email: '', address: '', notes: '' });

                const togglePolicy = (id) => { expandedPolicies.value[id] = !expandedPolicies.value[id]; if (!expandedPolicies.value[id]) editingPolicies.value[id] = false; };
                const startEditPolicy = (policy) => { if (!editPolicyData.value) editPolicyData.value = {}; let mode = policy.applicantMode; if (!mode) mode = (!policy.applicant || policy.applicant === selectedCustomer.value.name) ? 'same' : (customersDB.some(c => c.name === policy.applicant) ? 'existing' : 'new'); editPolicyData.value[policy.id] = { ...policy, applicantMode: mode, applicantGender: policy.applicantGender || 'M', applicantBirthday: policy.applicantBirthday || '', products: policy.products ? JSON.parse(JSON.stringify(policy.products)) : [] }; editingPolicies.value[policy.id] = true; };
                const cancelEditPolicy = (id) => { editingPolicies.value[id] = false; };
                const saveEditPolicy = (id) => { const idx = selectedCustomer.value.policies.findIndex(p => p.id === id); if (idx !== -1) { const data = editPolicyData.value[id]; if (data.applicantMode === 'same') data.applicant = selectedCustomer.value.name; Object.assign(selectedCustomer.value.policies[idx], data); editingPolicies.value[id] = false; showToast('✅ 儲存成功'); } };

                const deletePolicy = (id) => {
                    if (confirm('確定要刪除此保單嗎？')) {
                        const idx = selectedCustomer.value.policies.findIndex(p => p.id === id);
                        if (idx !== -1) {
                            selectedCustomer.value.policies.splice(idx, 1);
                            showToast('🗑️ 已刪除保單');
                        }
                    }
                };

                const filteredCustomers = computed(() => { if (!searchQuery.value) return []; const q = searchQuery.value.toLowerCase(); return customersDB.filter(c => c.name.includes(q) || c.phone.includes(q)); });
                const selectCustomer = (customer) => { selectedCustomer.value = customer; searchQuery.value = ''; isCustomerExpanded.value = false; isEditingCustomer.value = false; expandedPolicies.value = {}; editingPolicies.value = {}; };
                const clearCustomer = () => { selectedCustomer.value = null; showAddPolicyForm.value = false; isCustomerExpanded.value = false; isEditingCustomer.value = false; expandedPolicies.value = {}; editingPolicies.value = {}; };
                const toggleCustomerInfo = () => { isCustomerExpanded.value = !isCustomerExpanded.value; if (!isCustomerExpanded.value) isEditingCustomer.value = false; };
                const startEditCustomer = () => { editCustomerData.value = { ...selectedCustomer.value }; isEditingCustomer.value = true; };
                const saveCustomerInfo = () => { Object.assign(selectedCustomer.value, editCustomerData.value); isEditingCustomer.value = false; showToast('✅ 更新成功'); };
                const cancelEditCustomer = () => { isEditingCustomer.value = false; };

                const startAddCustomer = () => {
                    isAddingCustomer.value = true; selectedCustomer.value = null; searchQuery.value = '';
                    newCustomerData.value = { name: '', idNumber: '', phone: '', birthday: '', email: '', address: '', notes: '' };
                };
                const cancelAddCustomer = () => { isAddingCustomer.value = false; };
                const saveNewCustomer = () => {
                    if (!newCustomerData.value.name || !newCustomerData.value.name?.trim()) { showToast('⚠️ 請輸入客戶姓名'); return; }
                    const newCust = {
                        id: 'C' + Date.now(), ...newCustomerData.value, score: 0, customerType: '新客戶',
                        gaps: [ { name: '醫療實支實付', percent: 0 }, { name: '意外傷害', percent: 0 }, { name: '壽險保障', percent: 0 }, { name: '重大傷病/癌症', percent: 0 }, { name: '長期照顧', percent: 0 } ],
                        aiGood: '目前尚未建立保單紀錄。', aiBad: '各項保障皆處於空窗期，風險抵禦能力較弱。', aiSuggestion: '建議盡速進行基礎保障規劃，包含實支實付與意外險。', policies: []
                    };
                    customersDB.unshift(newCust); showToast('✅ 新增客戶成功！'); isAddingCustomer.value = false; selectCustomer(newCust);
                };

                const customerOptionsSelect = computed(() => customersDB.map(c => ({ value: c.name, label: c.name })));
                const showAddPolicyForm = ref(false); const addPolicyFormRef = ref(null);
                const addPolicyMethod = ref('manual'); const isOcrProcessing = ref(false);
                const newPolicyData = ref({ company: '', name: '', type: '', policyNumber: '', effectiveDate: '', paymentDate: '', paymentFrequency: '年繳', notes: '', applicantMode: 'same', applicant: '', applicantGender: 'M', applicantBirthday: '', products: [] });

                const handleAddPolicyClick = async () => { showAddPolicyForm.value = true; await nextTick(); setTimeout(() => { if (addPolicyFormRef.value) addPolicyFormRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150); };
                const cancelAddPolicy = () => { showAddPolicyForm.value = false; newPolicyData.value = { company: '', name: '', type: '', policyNumber: '', effectiveDate: '', paymentDate: '', paymentFrequency: '年繳', notes: '', applicantMode: 'same', applicant: '', applicantGender: 'M', applicantBirthday: '', products: [] }; addPolicyMethod.value = 'manual'; isOcrProcessing.value = false; };
                const handleFileUpload = (e) => { if (!e.target.files[0]) return; isOcrProcessing.value = true; setTimeout(() => { isOcrProcessing.value = false; newPolicyData.value = { ...newPolicyData.value, company: '遠雄人壽', name: '康富醫療健康保險附約(RM1)', type: '醫療實支', products: [{id: 'p_1', name: '康富醫療健康保險附約(RM1)', type: '醫療實支'}] }; addPolicyMethod.value = 'manual'; showToast('✅ 辨識完成'); e.target.value = ''; }, 1500); };
                const savePolicy = () => { if (!newPolicyData.value.company) return showToast('請填寫必填欄位'); if (newPolicyData.value.applicantMode === 'same') newPolicyData.value.applicant = selectedCustomer.value.name; selectedCustomer.value.policies.push({ id: 'pol_' + Date.now(), ...newPolicyData.value }); showToast('✅ 新增成功！'); cancelAddPolicy(); if (selectedCustomer.value.score < 95) selectedCustomer.value.score += 2; };

                const compareTableRef = ref(null); let compIsDown = false, compStartX = 0, compScrollLeft = 0;
                const compDragStart = (e) => { compIsDown = true; compStartX = e.pageX - compareTableRef.value.offsetLeft; compScrollLeft = compareTableRef.value.scrollLeft; };
                const compDragMove = (e) => { if (!compIsDown) return; e.preventDefault(); const x = e.pageX - compareTableRef.value.offsetLeft; compareTableRef.value.scrollLeft = compScrollLeft - (x - compStartX) * 1.5; };
                const compDragEnd = () => { compIsDown = false; };

                const topicTableRef = ref(null); let topicIsDown = false, topicStartX = 0, topicScrollLeft = 0;
                const topicDragStart = (e) => { topicIsDown = true; topicStartX = e.pageX - topicTableRef.value.offsetLeft; topicScrollLeft = topicTableRef.value.scrollLeft; };
                const topicDragMove = (e) => { if (!topicIsDown) return; e.preventDefault(); const x = e.pageX - topicTableRef.value.offsetLeft; topicTableRef.value.scrollLeft = topicScrollLeft - (x - topicStartX) * 1.5; };
                const topicDragEnd = () => { topicIsDown = false; };

                const customTopic = ref(''); const isGeneratingPitch = ref(false);
                const trendingTopics = ref([ { id: 'topic4', emoji: '⛽', title: '油價物價雙漲', context: '近期國內外油價持續攀升，帶動民生物資齊漲。', pitches: [{ target: '通勤族/上班族', text: '「最近物價一直漲，不如趁現在讓我幫您做個免費『保單健診』，把預算省下來對抗通膨！」' }, { target: '家庭客群', text: '「越是這種時候，我們越要確定家裡的『防護網』沒有破洞，讓我幫您重新檢視保障吧！」' }] }, { id: 'topic1', emoji: '🏥', title: '健保停付指示用藥', context: '健保署宣布將逐步取消部分指示用藥健保給付。', pitches: [{ target: '年輕小資族', text: '「醫療自費項目越來越多！趁年輕保費便宜，我們檢視一下實支實付額度夠不夠好嗎？」' }] } ]);
                const selectedTopic = ref(trendingTopics.value[0]); 
                const copyToClipboard = (text) => { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast('已複製！'); } catch(e) {} document.body.removeChild(ta); };

                const generatePitch = async () => { if (!customTopic.value?.trim()) return; isGeneratingPitch.value = true; try { const prompt = `請針對保險主題「${customTopic.value}」，以台灣保險業務員的口吻，生成兩段針對不同客群的行銷切入話術。請必須且只以 JSON 格式回傳，格式如下： { "title": "${customTopic.value}", "context": "簡短的主題背景說明", "pitches": [ { "target": "目標客群1", "text": "話術內容1" }, { "target": "目標客群2", "text": "話術內容2" } ] }`; const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }; const jsonText = await fetchGemini(payload); const result = JSON.parse(jsonText); const newTopic = { ...result, id: 'custom_' + Date.now(), emoji: '✨' }; trendingTopics.value.unshift(newTopic); selectedTopic.value = newTopic; customTopic.value = ''; showToast('✨ 生成成功！'); } catch (error) { showToast('⚠️ 生成失敗，請重試'); } finally { isGeneratingPitch.value = false; } };

                const showCustomComboManagerModal = ref(false); const editingCombo = ref(null);
                const singleProductsOptions = computed(() => Object.values(products).filter(p => p.planType !== '專案').map(p => ({ value: p.id, label: p.name })));
                const startAddCombo = () => { editingCombo.value = { id: 'cc_' + Date.now(), company: '組合', shortName: '', name: '', planType: '自訂組合', saleStatus: '現售', subItems: [] }; };
                const startEditCombo = (combo) => { editingCombo.value = JSON.parse(JSON.stringify(combo)); };
                const deleteCombo = (id) => { if(confirm('確定要刪除這個自訂組合嗎？')){ customCombos.value = customCombos.value.filter(c => c.id !== id); showToast('🗑️ 已刪除自訂組合'); compareSlots.value.forEach(s => { if(s.prodId === id) s.prodId = ''; }); if (!compareSlots.value.some(s => s.prodId)) isCompareResultVisible.value = false; } };
                const removeComboItem = (idx) => { editingCombo.value.subItems.splice(idx, 1); };
                const saveCombo = () => { if (!editingCombo.value.name) return showToast('⚠️ 請輸入組合名稱'); editingCombo.value.shortName = editingCombo.value.name; const existingIdx = customCombos.value.findIndex(c => c.id === editingCombo.value.id); if (existingIdx >= 0) customCombos.value[existingIdx] = editingCombo.value; else customCombos.value.push(editingCombo.value); editingCombo.value = null; showToast('✅ 組合已儲存'); };
                const cancelEditCombo = () => { editingCombo.value = null; };

                const showComboItemSelectorModal = ref(false);
                const comboSearchComp = ref('');
                const comboSearchProd = ref('');
                const comboSearchType = ref('');
                const comboSearchStatus = ref('');

                const comboFilteredProducts = computed(() => {
                    let res = Object.values(products).filter(p => p.planType !== '專案');
                    if (comboSearchComp.value) res = res.filter(p => p.company === comboSearchComp.value);
                    if (comboSearchProd.value) res = res.filter(p => p.id === comboSearchProd.value);
                    if (comboSearchType.value) res = res.filter(p => p.planType === comboSearchType.value || p.insType === comboSearchType.value);
                    if (comboSearchStatus.value) res = res.filter(p => p.saleStatus === comboSearchStatus.value);
                    return res;
                });

                const comboModalProductOptions = computed(() => {
                    let res = Object.values(products).filter(p => p.planType !== '專案');
                    if (comboSearchComp.value) res = res.filter(p => p.company === comboSearchComp.value);
                    return res.map(p => ({ value: p.id, label: p.name }));
                });

                const resetComboModalSearch = () => { comboSearchComp.value = ''; comboSearchProd.value = ''; comboSearchType.value = ''; comboSearchStatus.value = ''; };

                const tempSelectedComboItems = ref(new Set());

                const openComboItemSelector = () => {
                    resetComboModalSearch(); tempSelectedComboItems.value = new Set(); showComboItemSelectorModal.value = true;
                };
                const closeComboItemSelector = () => { showComboItemSelectorModal.value = false; };
                
                const toggleComboItemSelection = (prodId) => {
                    const newSet = new Set(tempSelectedComboItems.value);
                    if (newSet.has(prodId)) newSet.delete(prodId);
                    else newSet.add(prodId);
                    tempSelectedComboItems.value = newSet;
                };

                const confirmComboItemsSelection = () => {
                    let count = 0;
                    tempSelectedComboItems.value.forEach(prodId => {
                        const p = products[prodId];
                        if (p) {
                            const premiumVal = String(p.premium).replace(/,/g,'').match(/\d+/) ? String(p.premium).replace(/,/g,'').match(/\d+/)[0] : '0';
                            editingCombo.value.subItems.push({ id: p.id, type: p.insType || p.planType || '附約', code: p.id, name: p.name, amount: p.unit === '萬元' ? parseInt(p.amount) || '100' : p.amount, unit: p.unit || '萬元', term: p.term || '1年期', premiumM: premiumVal, premiumF: premiumVal });
                            count++;
                        }
                    });
                    if (count > 0) showToast(`✅ 已成功加入 ${count} 項商品`);
                    closeComboItemSelector();
                };

                return {
                    isLoggedIn, isLoggingIn, loginForm, handleLogin, handleLogout,
                    activeTab, coverageSubTab, productSubTab, toastMessage, showToast, navItems, headerTitle, headerSubtitle,
                    companyList, productList, customerOptions: customerOptionsSelect, productOptions, companyOptions, 
                    products, compareCategories, getProduct, highlightDiff,
                    selectedProductDetail, openProductModal, closeProductModal, showRulesModal, showTermsModal,
                    userInput, isTyping, chatContainer, quickQueryContainer, messages, quickQueries, sendMessage, handleQuickQuery, 
                    chatFileInput, chatAttachment, triggerChatFileUpload, handleChatFileUpload, removeChatAttachment, 
                    isRecording, toggleVoiceInput, startDrag, onDrag, stopDrag,
                    claimIncidents, selectedIncident, claimCalcStatus, estimatedClaimResult, handleClaimCalcUpload, resetClaimCalc,
                    claimSearchQuery, selectedClaimCustomer, claimFilteredCustomers, matchedClaimCompanies,
                    expandedClaimCompanies, toggleClaimCompany,
                    searchQuery, selectedCustomer, filteredCustomers, selectCustomer, clearCustomer, isCustomerExpanded, isEditingCustomer, editCustomerData, toggleCustomerInfo, startEditCustomer, saveCustomerInfo, cancelEditCustomer, calculateAge, expandedPolicies, editingPolicies, editPolicyData, togglePolicy, startEditPolicy, saveEditPolicy, cancelEditPolicy, deletePolicy, showAddPolicyForm, addPolicyFormRef, handleAddPolicyClick, addPolicyMethod, isOcrProcessing, newPolicyData, handleFileUpload, savePolicy, cancelAddPolicy,
                    compareList, showGamifiedModal, addToCompare, updateCompareList, handleAnalyzeAction, 
                    compareSlots, draggingIndex, onSlotDragStart, addCompareSlot, removeCompareSlot,
                    calculateItemTotalPremium, getSlotTotalPremium, getSlotTotalOverallPremium,
                    isCompareSlotsExpanded, activeSlotIndex,
                    isCompareResultVisible, showCompareSettingsModal, compareGlobalSettings, openCompareSettingsModal, confirmCompareSettings,
                    selectorActiveTab, showProductSelectorModal, filteredProductsForSelector, openProductSelector, closeProductSelector, selectProductForSlot, searchComp, searchProd, searchType, searchStatus, resetModalSearch, modalCompanyOptions, modalProductOptions, isProductSelected,
                    selectedCompany, uniqueCompanies, filteredProductsForSimilar, filteredProductOptions, onCompanyChange, similarTarget, getSimilarProducts, jumpToCompare,
                    compareTableRef, compDragStart, compDragMove, compDragEnd, topicTableRef, topicDragStart, topicDragMove, topicDragEnd,
                    trendingTopics, selectedTopic, copyToClipboard, customTopic, isGeneratingPitch, generatePitch,
                    isDarkMode, toggleDarkMode,
                    isAddingCustomer, newCustomerData, startAddCustomer, cancelAddCustomer, saveNewCustomer,
                    customCombos, showCustomComboManagerModal, editingCombo, singleProductsOptions, startAddCombo, startEditCombo, deleteCombo, removeComboItem, saveCombo, cancelEditCombo,
                    showComboItemSelectorModal, comboSearchComp, comboSearchProd, comboSearchType, comboSearchStatus,
                    comboFilteredProducts, comboModalProductOptions, openComboItemSelector, closeComboItemSelector, resetComboModalSearch,
                    tempSelectedComboItems, toggleComboItemSelection, confirmComboItemsSelection,
                    isSimilarFiltersExpanded, isSelectorFiltersExpanded, isComboSelectorFiltersExpanded, isGlobalSettingsExpanded
                };
            }
        });

        app.component('searchable-input', {
            props: ['modelValue', 'options', 'placeholder'], emits: ['update:modelValue'],
            setup(props, { emit }) {
                const isOpen = ref(false);
                const filteredOptions = computed(() => { if (!props.modelValue) return props.options || []; return (props.options || []).filter(o => String(o).toLowerCase().includes(String(props.modelValue).toLowerCase())); });
                const selectOption = (opt) => { emit('update:modelValue', opt); isOpen.value = false; };
                const handleInput = (e) => { emit('update:modelValue', e.target.value); isOpen.value = true; };
                const hideDropdown = () => { setTimeout(() => { isOpen.value = false; }, 200); };
                return { isOpen, filteredOptions, selectOption, handleInput, hideDropdown };
            },
            template: `
                <div class="relative w-full text-left">
                    <input type="text" :value="modelValue" @input="handleInput" @focus="isOpen = true" @blur="hideDropdown" :placeholder="placeholder" class="w-full bg-white dark:bg-stripe-darkBg border border-indigo-100 dark:border-gray-700 text-slate-800 dark:text-white rounded-full px-3 py-2 text-xs focus:border-stripe-blurple focus:shadow-stripe-focus outline-none transition-all placeholder-indigo-300 shadow-sm">
                    <i class="fa-solid fa-magnifying-glass absolute right-3 top-2.5 text-indigo-300 text-xs pointer-events-none"></i>
                    <div v-if="isOpen && filteredOptions?.length > 0" class="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur dark:bg-stripe-darkCard border border-indigo-100 dark:border-gray-700 rounded-xl shadow-stripe max-h-48 overflow-y-auto">
                        <div v-for="opt in filteredOptions" :key="opt" @mousedown.prevent="selectOption(opt)" class="px-3 py-2.5 text-xs text-slate-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 cursor-pointer border-b border-indigo-50 dark:border-gray-700/50 last:border-0 transition-colors font-bold">{{ opt }}</div>
                    </div>
                </div>
            `
        });

        app.component('searchable-select', {
            props: ['modelValue', 'options', 'placeholder', 'disabled', 'compact'], emits: ['update:modelValue', 'change'],
            setup(props, { emit }) {
                const isOpen = ref(false); const searchKeyword = ref('');
                watch(() => props.modelValue, (newVal) => { const opt = (props.options || []).find(o => o.value === newVal); searchKeyword.value = opt ? opt.label : ''; }, { immediate: true });
                const filteredOptions = computed(() => {
                    if (!props.options) return []; const q = searchKeyword.value.toLowerCase();
                    const selectedOpt = props.options.find(o => o.value === props.modelValue);
                    if (selectedOpt && searchKeyword.value === selectedOpt.label) return props.options;
                    return props.options.filter(o => String(o.label).toLowerCase().includes(q));
                });
                const selectOption = (opt) => { searchKeyword.value = opt.label; emit('update:modelValue', opt.value); emit('change', opt.value); isOpen.value = false; };
                const handleInput = (e) => { searchKeyword.value = e.target.value; isOpen.value = true; };
                const hideDropdown = () => { setTimeout(() => { isOpen.value = false; const opt = (props.options || []).find(o => o.value === props.modelValue); if (opt) searchKeyword.value = opt.label; }, 200); };
                return { isOpen, searchKeyword, filteredOptions, selectOption, handleInput, hideDropdown };
            },
            template: `
                <div class="relative w-full text-left" :class="{'opacity-50': disabled}">
                    <input type="text" :value="searchKeyword" @input="handleInput" @focus="!disabled && (isOpen = true, searchKeyword='')" @blur="hideDropdown" :placeholder="placeholder" :disabled="disabled" 
                        class="w-full bg-white dark:bg-stripe-darkBg border border-indigo-100 dark:border-gray-700 text-slate-800 dark:text-white rounded-full outline-none transition-all placeholder-indigo-300 shadow-sm cursor-text disabled:bg-indigo-50/50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed focus:border-stripe-blurple focus:shadow-stripe-focus"
                        :class="compact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-sm'">
                    <i class="fa-solid fa-chevron-down absolute right-3 pointer-events-none text-indigo-300 dark:text-gray-400" :class="compact ? 'top-[7px] text-[10px]' : 'top-[10px] text-xs'"></i>
                    <div v-if="isOpen && filteredOptions?.length > 0" class="absolute z-[100] w-full mt-1 bg-white/95 backdrop-blur dark:bg-stripe-darkCard border border-indigo-100 dark:border-gray-700 rounded-xl shadow-[0_8px_30px_rgba(99,91,255,0.08)] max-h-48 overflow-y-auto">
                        <div v-for="opt in filteredOptions" :key="opt.value" @mousedown.prevent="selectOption(opt)" class="px-3 text-slate-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 cursor-pointer border-b border-indigo-50 dark:border-gray-700/50 last:border-0 transition-colors font-bold" :class="compact ? 'py-2 text-[10px]' : 'py-2.5 text-sm'">{{ opt.label }}</div>
                    </div>
                </div>
            `
        });

        app.mount('#app');