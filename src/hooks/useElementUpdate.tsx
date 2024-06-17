import { useRef, useEffect } from 'react';

import { Layer, LeafletEvent } from 'leaflet';

interface UpdateEvent<T, U> extends LeafletEvent {
  target: T;
  sourceTarget: U;
}

export interface UseElementUpdateHook<T = any, K = any, C = any> {
  element?: T;
  props: K;
  handlers: {
    [key in keyof K]?: (
      prevValue: K[key],
      nextValue: K[key],
      instance: T,
    ) => void;
  } & {
    allProps?: (prevValues: K, nextValues: K, instance: T) => void;
  };
  onElementUpdateMethod?: (event: UpdateEvent<T, C>) => void;
  afterUpdateProps?: (instance: T) => void;
}

const shallowEqual = (obj1: any, obj2: any) => {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

/**
 * `@recommended` Hook that allows the update of a component made by a leaflet instance
 *
 * Is triggered when element.update method call and when props values changes
 *
 * TS Helper
 *
 * 1° `Element type`
 *
 * 2° `Component props type`
 *
 * 3° `Container type`
 */
export const useElementUpdate = <
  T extends object = any,
  K extends object = any,
  C extends object = any,
>({
  element,
  props,
  handlers = {},
  onElementUpdateMethod,
  afterUpdateProps,
}: UseElementUpdateHook<T, K, C>) => {
  const prevProps = useRef<K>();

  useEffect(() => {
    if (!element) return;

    if (prevProps.current) {
      const calledKeys: (keyof K)[] = [];

      Object.keys(props).forEach(key => {
        const propName = key as keyof T;
        const prevValue = (prevProps as any)?.current[propName];
        const nextValue = (props as any)[propName as string];

        const propHandler = (handlers as any)[propName as string];

        if (propHandler && !shallowEqual(prevValue, nextValue)) {
          propHandler(prevValue, nextValue, element);
          calledKeys.push(propName as any); // Register the key called
        }
      });

      const allPropsHandler = handlers?.allProps;

      if (allPropsHandler) {
        const filteredPrevProps = { ...prevProps.current };
        const filteredNextProps = { ...props };

        calledKeys.forEach(key => {
          delete filteredPrevProps[key];
          delete filteredNextProps[key];
        });

        allPropsHandler(
          filteredPrevProps as K,
          filteredNextProps as K,
          element,
        );
      }

      if (afterUpdateProps) afterUpdateProps(element!);
    }

    prevProps.current = props;
  }, [props, handlers, element, afterUpdateProps]);

  useEffect(() => {
    if (!element || !onElementUpdateMethod) return;

    (element as Layer)?.on('update', onElementUpdateMethod);

    return () => {
      (element as Layer)?.off('update', onElementUpdateMethod);
    };
  }, [element, onElementUpdateMethod]);

  return null;
};
