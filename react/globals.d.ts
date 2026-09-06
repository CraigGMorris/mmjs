/**
 * Ambient type definitions for Math Minion React environment.
 */

declare namespace React {
	type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNodeArray | Iterable<ReactNode>;
	interface ReactNodeArray extends Array<ReactNode> {}
	interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
		type: T;
		props: P;
		key: any;
	}
	type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null) | (new (props: P) => Component<any, any>);

	type SetStateAction<S> = S | ((prevState: S) => S);
	type Dispatch<A> = (value?: A) => void;

	function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
	function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];

	type EffectCallback = () => (void | (() => void | undefined));
	type DependencyList = ReadonlyArray<any>;
	function useEffect(effect: EffectCallback, deps?: DependencyList): void;

	function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;

	interface MutableRefObject<T> {
		current: T;
	}
	interface RefObject<T> {
		readonly current: T | null;
	}
	function useRef<T>(initialValue: T): MutableRefObject<T>;
	function useRef<T = undefined>(): MutableRefObject<T | undefined>;

	function useMemo<T>(factory: () => T, deps: DependencyList | undefined): T;

	function createElement(
		type: any,
		props?: any,
		...children: any[]
	): ReactElement;

	function createRef<T>(): RefObject<T>;

	const Fragment: any;

	class Component<P = {}, S = {}, SS = any> {
		constructor(props: P, context?: any);
		setState<K extends keyof S>(
			state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
			callback?: () => void
		): void;
		forceUpdate(callback?: () => void): void;
		render(): ReactNode;
		readonly props: Readonly<P> & Readonly<{ children?: ReactNode }>;
		state: Readonly<S>;
		context: any;
		refs: { [key: string]: any };
		componentDidMount?(): void;
		shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
		componentWillUnmount?(): void;
		componentDidCatch?(error: Error, errorInfo: any): void;
		getSnapshotBeforeUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>): SS | null;
		componentDidUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot?: SS): void;
	}

	class PureComponent<P = {}, S = {}, SS = any> extends Component<P, S, SS> {}
}

declare namespace ReactDOM {
	interface Root {
		render(children: React.ReactNode): void;
		unmount(): void;
	}
	interface RootOptions {
		identifierPrefix?: string;
		onRecoverableError?: (error: unknown, errorInfo: { componentStack?: string }) => void;
	}
	function createRoot(
		container: Element | Document | DocumentFragment,
		options?: RootOptions
	): Root;
	function hydrateRoot(
		container: Element | Document | DocumentFragment,
		children: React.ReactNode,
		options?: RootOptions
	): Root;
	function flushSync<R>(fn: () => R): R;
	function flushSync(): void;
	function render(
		element: React.ReactElement | React.ReactNode,
		container: Element | Document | DocumentFragment | null,
		callback?: () => void
	): any;
	function findDOMNode(instance: any): Element | null | Text;
}

declare module 'react-dom/client' {
	export interface Root {
		render(children: React.ReactNode): void;
		unmount(): void;
	}
	export interface RootOptions {
		identifierPrefix?: string;
		onRecoverableError?: (error: unknown, errorInfo: { componentStack?: string }) => void;
	}
	export function createRoot(
		container: Element | Document | DocumentFragment,
		options?: RootOptions
	): Root;
	export function hydrateRoot(
		container: Element | Document | DocumentFragment,
		children: React.ReactNode,
		options?: RootOptions
	): Root;
}

declare var i18next: any;
declare var i18nextXHRBackend: any;
declare var modulesLoaded: boolean | undefined;
