import { cn } from '@/lib/utils'
import { CaretRight, File as FileIcon, Folder as FolderIcon } from 'phosphor-react'
import { createContext, forwardRef, useCallback, useContext, useEffect, useState } from 'react'

interface TreeViewElement {
  id: string
  name: string
  isSelectable?: boolean
  children?: TreeViewElement[]
}

interface TreeContextProps {
  selectedId?: string
  expandedItems?: string[]
  indicator: boolean
  handleExpand: (id: string) => void
  selectItem: (id: string) => void
  setExpandedItems?: (items: string[]) => void
  openIcon?: React.ReactNode
  closeIcon?: React.ReactNode
  dir: 'rtl' | 'ltr'
}

const TreeContext = createContext<TreeContextProps | null>(null)

const useTree = () => {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider')
  }
  return context
}

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {
  initialSelectedId?: string
  indicator?: boolean
  elements?: TreeViewElement[]
  initialExpandedItems?: string[]
  openIcon?: React.ReactNode
  closeIcon?: React.ReactNode
  dir?: 'rtl' | 'ltr'
}

const Tree = forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      className,
      elements,
      initialSelectedId,
      initialExpandedItems = [],
      indicator = true,
      openIcon,
      closeIcon,
      dir = 'ltr',
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId)
    const [expandedItems, setExpandedItemsState] = useState<string[]>(initialExpandedItems)

    const selectItem = useCallback((id: string) => {
      setSelectedId(id)
    }, [])

    const handleExpand = useCallback((id: string) => {
      setExpandedItemsState((prev) => {
        const newExpanded = prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
        return newExpanded
      })
    }, [])

    const expandSpecificTargetedElements = useCallback(
      (elements?: TreeViewElement[], selectId?: string) => {
        if (!elements || !selectId) return
        const findParent = (
          currentElement: TreeViewElement,
          currentPath: string[] = []
        ): string[] | null => {
          const isSelectable = currentElement.isSelectable ?? true
          const newPath = [...currentPath, currentElement.id]
          if (currentElement.id === selectId) {
            if (isSelectable) {
              setExpandedItemsState((prev) => [...prev, ...newPath])
            }
            return newPath
          }
          if (isSelectable && currentElement.children && currentElement.children.length > 0) {
            for (const child of currentElement.children) {
              const result = findParent(child, newPath)
              if (result) {
                setExpandedItemsState((prev) => [...prev, ...result])
                return result
              }
            }
          }
          return null
        }

        for (const element of elements) {
          findParent(element)
        }
      },
      []
    )

    useEffect(() => {
      if (initialSelectedId) {
        expandSpecificTargetedElements(elements, initialSelectedId)
      }
    }, [initialSelectedId, elements, expandSpecificTargetedElements])

    const direction = dir === 'rtl' ? 'rtl' : 'ltr'

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expandedItems,
          handleExpand,
          selectItem,
          setExpandedItems: setExpandedItemsState,
          indicator,
          openIcon,
          closeIcon,
          dir: direction
        }}
      >
        <div className={cn('size-full', className)}>
          <div
            {...props}
            ref={ref}
            className="relative overflow-hidden"
            style={{ direction }}
          >
            {elements?.map((element) => (
              <TreeItem
                key={element.id}
                elements={[element]}
                className="select-none"
              />
            ))}
          </div>
        </div>
      </TreeContext.Provider>
    )
  }
)

Tree.displayName = 'Tree'

interface TreeItemProps extends React.HTMLAttributes<HTMLDivElement> {
  elements?: TreeViewElement[]
  level?: number
}

const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(
  ({ className, elements, level = 0, ...props }, ref) => {
    const { expandedItems, indicator, openIcon, closeIcon } = useTree()

    return (
      <div ref={ref} role="tree" className={className} {...props}>
        <ul role="group">
          {elements?.map((element) => {
            const isOpen = expandedItems?.includes(element.id)
            const isFolder = element.children && element.children.length > 0
            const isSelectable = element.isSelectable ?? true

            return (
              <li key={element.id} className="relative list-none" role="treeitem">
                {isFolder ? (
                  <Folder
                    element={element.name}
                    value={element.id}
                    isSelectable={isSelectable}
                    level={level}
                  >
                    {isOpen && (
                      <TreeItem
                        key={element.id}
                        elements={element.children}
                        level={level + 1}
                      />
                    )}
                  </Folder>
                ) : (
                  <File
                    value={element.id}
                    isSelectable={isSelectable}
                    level={level}
                  >
                    {element.name}
                  </File>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }
)

TreeItem.displayName = 'TreeItem'

interface FolderProps extends React.HTMLAttributes<HTMLDivElement> {
  element: string
  value: string
  isSelectable?: boolean
  isSelect?: boolean
  level?: number
}

const Folder = forwardRef<HTMLDivElement, FolderProps>(
  ({ className, element, value, isSelectable = true, level = 0, children, ...props }, ref) => {
    const {
      selectedId,
      expandedItems,
      handleExpand,
      selectItem,
      indicator,
      openIcon,
      closeIcon,
      dir
    } = useTree()

    const isOpen = expandedItems?.includes(value)
    const isSelected = selectedId === value

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center py-1 pr-1 text-left before:absolute before:left-1.5 before:block before:h-[1.5rem] before:w-px before:bg-muted-foreground/20',
          // Indentation based on level
          level === 0 ? 'pl-2' : `pl-[${level * 1.5 + 0.5}rem]`,
          className
        )}
        {...props}
      >
        {indicator && (
          <div className="relative flex h-1.5 w-1.5 shrink-0 rounded-md border border-border bg-muted-foreground/20 hover:bg-accent" />
        )}
        <div
          className={cn(
            'relative flex cursor-pointer items-center text-sm ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rtl:space-x-reverse',
            dir === 'rtl' ? 'space-x-reverse' : '',
            isSelected && 'bg-muted',
            isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
          )}
          onClick={() => {
            if (isSelectable) {
              handleExpand(value)
              selectItem(value)
            }
          }}
        >
          {isOpen ? (
            openIcon ?? (
              <CaretRight
                className={cn(
                  'h-4 w-4 shrink-0 text-accent-foreground/50 transition-transform duration-200',
                  isOpen && 'rotate-90'
                )}
              />
            )
          ) : (
            closeIcon ?? (
              <CaretRight
                className={cn(
                  'h-4 w-4 shrink-0 text-accent-foreground/50 transition-transform duration-200',
                  isOpen && 'rotate-90'
                )}
              />
            )
          )}
          <FolderIcon className="h-4 w-4 shrink-0 text-accent-foreground/50" />
          <span className="flex-grow truncate">{element}</span>
        </div>
        {children}
      </div>
    )
  }
)

Folder.displayName = 'Folder'

interface FileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  isSelectable?: boolean
  isSelect?: boolean
  fileIcon?: React.ReactNode
  level?: number
}

const File = forwardRef<HTMLDivElement, FileProps>(
  ({ className, value, isSelectable = true, fileIcon, level = 0, children, ...props }, ref) => {
    const { selectedId, selectItem, indicator, dir } = useTree()
    const isSelected = selectedId === value

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center py-1 pr-1 text-left before:absolute before:left-1.5 before:block before:h-[1.5rem] before:w-px before:bg-muted-foreground/20',
          // Indentation based on level
          level === 0 ? 'pl-2' : `pl-[${level * 1.5 + 0.5}rem]`,
          className
        )}
        {...props}
      >
        {indicator && (
          <div className="relative flex h-1.5 w-1.5 shrink-0 rounded-md border border-border bg-muted-foreground/20 hover:bg-accent" />
        )}
        <div
          className={cn(
            'relative flex cursor-pointer items-center text-sm ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rtl:space-x-reverse',
            dir === 'rtl' ? 'space-x-reverse' : '',
            isSelected && 'bg-muted',
            isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
          )}
          onClick={() => {
            if (isSelectable) {
              selectItem(value)
            }
          }}
        >
          {fileIcon ?? <FileIcon className="h-4 w-4 shrink-0 text-accent-foreground/50" />}
          <span className="flex-grow truncate">{children}</span>
        </div>
      </div>
    )
  }
)

File.displayName = 'File'

export { File, Folder, Tree, type TreeViewElement }
