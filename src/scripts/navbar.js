/**
 * Constructor function.
 */
class NavBar extends H5P.EventDispatcher {
  constructor(elemArray, contentId) {
    super();
    this.id = contentId;
    this.div = document.createElement('div');
    this.para = document.createElement('p');
    this.div.id = 'navbar';
    
    this.div.appendChild(this.parseElems(elemArray));  
  }
  

  //Parse element array to a more readable format
  parseElems(elemArray) {
    let alphaboi = document.createElement('ul');
    let node, ref;

    elemArray.forEach(elem => {
      
      node = document.createElement('li');
      ref = document.createElement('a');

      ref.href = "#" + elem.subContentId;
      ref.innerHTML = elem.library;
      node.appendChild(ref);
      alphaboi.appendChild(node);  
    });
    return alphaboi;
  }
}
export default NavBar;