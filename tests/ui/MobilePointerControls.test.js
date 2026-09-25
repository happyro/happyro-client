import { afterEach, expect, it, vi } from 'vitest';
import { bindPointerControls } from '../../src/UI/Mobile/game/PointerControls.js';
let controls;
afterEach(() => { controls?.destroy(); vi.useRealTimers(); });
function setup() {
 vi.useFakeTimers();
 const root = document.createElement('div');
 root.innerHTML = '<button data-shortcut="0"></button>';
 const scene = document.createElement('canvas'), skill = root.querySelector('button');
 for (const node of [scene, skill]) {
  const captures = new Set();
  node.setPointerCapture = id => captures.add(id);
  node.hasPointerCapture = id => captures.has(id);
  node.releasePointerCapture = id => captures.delete(id);
 }
 root.getBoundingClientRect = () => ({ left: 10, top: 20 });
 scene.getBoundingClientRect = () => ({ left: 10, top: 20, width: 800, height: 400 });
 skill.getBoundingClientRect = () => ({ left: 600, right: 640, top: 300, bottom: 340 });
 const actions = Object.fromEntries(['shortcut','move','stopMove','startMove','tap'].map(k=>[k,vi.fn()]));
 actions.enabled = vi.fn(() => true);
 controls = bindPointerControls(root, scene, actions);
 const fire = (node,type,id,x=100,y=200) => {
  const event = new Event(type,{bubbles:true,cancelable:true});
  Object.assign(event,{pointerId:id,clientX:x,clientY:y,button:0});node.dispatchEvent(event);
 };
 const drag = () => { fire(scene,'pointerdown',1); fire(scene,'pointermove',1,130,200); };
 return { scene, skill, actions, fire, drag };
}
it('preserves simple scene taps without a joystick element',()=>{
 const {scene,actions,fire}=setup();
 fire(scene,'pointerdown',1);
 fire(scene,'pointermove',1,103,202);expect(actions.move).not.toHaveBeenCalled();
 fire(scene,'pointerup',1,103,202);expect(actions.tap).toHaveBeenCalledExactlyOnceWith(103,202);
 expect(vi.getTimerCount()).toBe(0);
});
it('left dragging moves continuously in the chosen direction and releasing never taps',()=>{
 const {scene,actions,fire,drag}=setup();drag();
 expect(actions.startMove).toHaveBeenCalledOnce();expect(actions.move).toHaveBeenLastCalledWith(1,-0);
 vi.advanceTimersByTime(400);expect(actions.move).toHaveBeenCalledTimes(5);
 fire(scene,'pointermove',1,100,170);vi.advanceTimersByTime(200);expect(actions.move).toHaveBeenLastCalledWith(0,1);
 fire(scene,'pointerup',1,100,170);expect(controls.isMoving()).toBe(false);
 expect(actions.tap).not.toHaveBeenCalled();const count=actions.move.mock.calls.length;
 vi.advanceTimersByTime(1000);expect(actions.move).toHaveBeenCalledTimes(count);expect(vi.getTimerCount()).toBe(0);
});
it('skill releases do not release the movement pointer and unrelated releases are ignored',()=>{
 const {scene,skill,actions,fire,drag}=setup();drag();
 fire(skill,'pointerdown',2,620,320);fire(scene,'pointerup',2);fire(skill,'pointerup',2,620,320);
 expect(actions.shortcut).toHaveBeenCalledExactlyOnceWith(0);expect(controls.isMoving()).toBe(true);
 vi.advanceTimersByTime(400);expect(actions.move).toHaveBeenCalledTimes(5);
});
it.each(['pointercancel','lostpointercapture'])('stops movement on %s',type=>{
 const {scene,actions,fire,drag}=setup();drag();fire(scene,type,1);
 expect(controls.isMoving()).toBe(false);expect(actions.tap).not.toHaveBeenCalled();
 expect(vi.getTimerCount()).toBe(0);
});
it('right-side drags do not move while right-side taps still select',()=>{
 const {scene,actions,fire}=setup();fire(scene,'pointerdown',1,600,200);
 fire(scene,'pointermove',1,630,200);fire(scene,'pointerup',1,630,200);
 expect(actions.move).not.toHaveBeenCalled();expect(actions.tap).not.toHaveBeenCalled();
 fire(scene,'pointerdown',2,600,200);fire(scene,'pointerup',2,600,200);expect(actions.tap).toHaveBeenCalledOnce();
});
it('modal or death cancels movement and all skill captures',()=>{
 const {scene,skill,actions,fire,drag}=setup();drag();fire(skill,'pointerdown',2,620,320);
 actions.enabled.mockReturnValue(false);vi.advanceTimersByTime(200);
 expect(scene.hasPointerCapture(1)).toBe(false);expect(skill.hasPointerCapture(2)).toBe(false);
 expect(vi.getTimerCount()).toBe(0);
});
it('cancellation and destruction remove held state and listeners without firing skills',()=>{
 const {scene,skill,actions,fire,drag}=setup();drag();fire(skill,'pointerdown',2,620,320);
 fire(skill,'pointercancel',2);expect(actions.shortcut).not.toHaveBeenCalled();
 controls.destroy();fire(scene,'pointerdown',3);
 expect(vi.getTimerCount()).toBe(0);
});

it('sends a turn immediately after the rate limit instead of waiting for the repeat tick', () => {
 const {scene,actions,fire,drag}=setup();drag();
 vi.advanceTimersByTime(151);
 fire(scene,'pointermove',1,100,170);
 expect(actions.move).toHaveBeenLastCalledWith(0,1);
 expect(actions.move).toHaveBeenCalledTimes(3);
});

it('coalesces fast turns into the newest direction within 50ms', () => {
 const {scene,actions,fire,drag}=setup();drag();
 vi.advanceTimersByTime(1);fire(scene,'pointermove',1,100,170);
 vi.advanceTimersByTime(19);fire(scene,'pointermove',1,70,200);
 vi.advanceTimersByTime(29);expect(actions.move).toHaveBeenCalledTimes(1);
 vi.advanceTimersByTime(1);expect(actions.move).toHaveBeenLastCalledWith(-1,-0);
 expect(actions.move).toHaveBeenCalledTimes(2);
});

it('reduces the reproduced 199ms post-tick turn wait to 49ms', () => {
 const {scene,actions,fire,drag}=setup();drag();vi.advanceTimersByTime(201);
 const count=actions.move.mock.calls.length;fire(scene,'pointermove',1,100,170);
 vi.advanceTimersByTime(48);expect(actions.move).toHaveBeenCalledTimes(count);
 vi.advanceTimersByTime(1);expect(actions.move).toHaveBeenLastCalledWith(0,1);
});

it('filters small hand jitter without delaying a accumulated turn', () => {
 const {scene,actions,fire,drag}=setup();drag();vi.advanceTimersByTime(60);
 fire(scene,'pointermove',1,130,199);expect(actions.move).toHaveBeenCalledTimes(1);
 fire(scene,'pointermove',1,130,196);expect(actions.move).toHaveBeenCalledTimes(2);
});

it.each(['pointerup','pointercancel','lostpointercapture'])('discards queued turns on %s', type => {
 const {scene,actions,fire,drag}=setup();drag();
 vi.advanceTimersByTime(1);fire(scene,'pointermove',1,100,170);
 fire(scene,type,1);vi.advanceTimersByTime(1000);
 expect(actions.move).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});

it('cancels a queued turn in the dead zone and resumes immediately from neutral', () => {
 const {scene,actions,fire,drag}=setup();drag();
 vi.advanceTimersByTime(1);fire(scene,'pointermove',1,100,170);
 vi.advanceTimersByTime(9);fire(scene,'pointermove',1,100,200);
 expect(controls.isMoving()).toBe(false);expect(actions.stopMove).toHaveBeenCalledOnce();
 vi.advanceTimersByTime(191);expect(actions.move).toHaveBeenCalledTimes(1);
 fire(scene,'pointermove',1,70,200);
 expect(actions.move).toHaveBeenLastCalledWith(-1,-0);expect(actions.startMove).toHaveBeenCalledTimes(2);
});

it('checks disabled input again before sending a queued turn', () => {
 const {scene,actions,fire,drag}=setup();drag();
 vi.advanceTimersByTime(1);fire(scene,'pointermove',1,100,170);
 actions.enabled.mockReturnValue(false);vi.advanceTimersByTime(49);
 expect(actions.move).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});
